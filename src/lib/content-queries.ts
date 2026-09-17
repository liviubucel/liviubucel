import { wixPublicClient } from './wix/client';
import { ricosToSafeHtml } from './wix/ricos';
import type { Language } from './i18n';

// Transitional content facade. Wix is now the source of truth for profile,
// SEO, certifications, portfolio and published blog content. Guestbook data
// remains behind the compatibility boundary until its write-path migration is
// complete.
export {
  getCategories,
  getAuthors,
  getGuestbookEntries,
  submitGuestbookEntry,
} from './sanity-queries';
export type { Author, Category } from './sanity-queries';

type UnknownRecord = Record<string, unknown>;

const EXCLUDED_WIX_BLOG_SLUGS = new Set([
  'creative-portfolio-showcase-tips-for-artists',
  'building-a-stunning-online-portfolio-best-practices',
  'maximizing-your-portfolio-impact-design-and-content',
]);

function unwrapDataItem(item: unknown): UnknownRecord {
  if (!item || typeof item !== 'object') return {};
  const record = item as UnknownRecord;
  const data = record.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { ...record, ...(data as UnknownRecord) };
  }
  return record;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asDateString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const raw = (value as UnknownRecord).$date;
    if (typeof raw === 'string' && raw.trim()) return raw;
  }
  return undefined;
}

function mediaUrl(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const url = (value as UnknownRecord).url;
    if (typeof url === 'string' && url.trim()) return url;
  }
  return undefined;
}

function portfolioImageUrl(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const imageInfo = (value as UnknownRecord).imageInfo;
  if (imageInfo && typeof imageInfo === 'object') {
    const url = (imageInfo as UnknownRecord).url;
    if (typeof url === 'string' && url.trim()) return url;
  }
  // Wix app collections may expose imageInfo as a wix:image URI. The public
  // card intentionally omits the image rather than guessing a CDN transform.
  return undefined;
}

async function getAll(collectionId: string, limit = 1000): Promise<UnknownRecord[]> {
  const result = await wixPublicClient.items.query(collectionId).limit(limit).find();
  return (result.items ?? []).map(unwrapDataItem);
}

export interface Post {
  _id: string;
  title: string;
  slug: string;
  language: Language;
  description: string;
  metaDescription?: string;
  keywords?: string[];
  pubDate: string;
  updatedAt?: string;
  featuredImage?: {
    asset: {
      _id: string;
      url: string;
    };
  };
  category?: {
    title: string;
    slug: string;
  };
  tags?: string[];
  author?: {
    name: string;
    email?: string;
  };
  body?: unknown[];
  bodyHtml?: string;
  minutesToRead?: number;
  published: boolean;
}

export interface Project {
  _id: string;
  title: string;
  slug: string;
  language: Language;
  description: string;
  metaDescription?: string;
  featuredImage?: {
    asset: {
      _id: string;
      url: string;
    };
  };
  tags?: string[];
  body?: unknown[];
  links?: {
    demo?: string;
    github?: string;
  };
  featured: boolean;
  pubDate?: string;
}

export interface Certification {
  _id: string;
  name: string;
  issuer: string;
  status: 'earned' | 'in-progress' | 'planned';
  iconType: string;
  order?: number;
  credentialUrl?: string;
}

export interface ProfileSettings {
  _id: string;
  isCurrentlyEmployed: boolean;
  cvUrl?: string;
  phone?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  tryhackme?: string;
  openToWorkMessage?: string;
}

export interface PageSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
}

function seoDescription(seoData: unknown): string | undefined {
  const seo = seoData && typeof seoData === 'object' ? (seoData as UnknownRecord) : {};
  const tags = Array.isArray(seo.tags) ? seo.tags : [];
  for (const tagValue of tags) {
    const tag = tagValue && typeof tagValue === 'object' ? (tagValue as UnknownRecord) : {};
    const props = tag.props && typeof tag.props === 'object' ? (tag.props as UnknownRecord) : {};
    if (tag.type === 'meta' && props.name === 'description') {
      return asString(props.content);
    }
  }
  return undefined;
}

function seoKeywords(seoData: unknown): string[] | undefined {
  const seo = seoData && typeof seoData === 'object' ? (seoData as UnknownRecord) : {};
  const settings = seo.settings && typeof seo.settings === 'object' ? (seo.settings as UnknownRecord) : {};
  const keywords = Array.isArray(settings.keywords) ? settings.keywords : [];
  const values = keywords
    .map((keyword) => {
      if (typeof keyword === 'string') return keyword;
      if (keyword && typeof keyword === 'object') {
        const row = keyword as UnknownRecord;
        return asString(row.term) ?? asString(row.keyword);
      }
      return undefined;
    })
    .filter((value): value is string => Boolean(value));
  return values.length ? values : undefined;
}

function estimateMinutes(contentText: string | undefined): number {
  if (!contentText) return 1;
  const words = contentText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function mapWixBlogPost(value: unknown, fallbackLang: Language = 'en'): Post {
  const row = value && typeof value === 'object' ? (value as UnknownRecord) : {};
  const slug = asString(row.slug) ?? '';
  const id = asString(row.id) ?? '';
  const languageValue = asString(row.language);
  const language: Language = languageValue === 'ro' ? 'ro' : languageValue === 'en' ? 'en' : fallbackLang;
  const excerpt = asString(row.excerpt) ?? asString(row.contentText) ?? '';
  const heroImage = row.heroImage && typeof row.heroImage === 'object' ? (row.heroImage as UnknownRecord) : {};
  const heroImageUrl = asString(heroImage.url);
  const contentText = asString(row.contentText);

  return {
    _id: id,
    title: asString(row.title) ?? '',
    slug,
    language,
    description: excerpt,
    metaDescription: seoDescription(row.seoData) ?? excerpt,
    keywords: seoKeywords(row.seoData),
    pubDate: asDateString(row.firstPublishedDate) ?? new Date(0).toISOString(),
    updatedAt: asDateString(row.lastPublishedDate),
    featuredImage: heroImageUrl
      ? {
          asset: {
            _id: asString(heroImage.id) ?? id,
            url: heroImageUrl,
          },
        }
      : undefined,
    body: row.richContent && typeof row.richContent === 'object'
      ? (Array.isArray((row.richContent as UnknownRecord).nodes) ? ((row.richContent as UnknownRecord).nodes as unknown[]) : [])
      : [],
    bodyHtml: ricosToSafeHtml(row.richContent),
    minutesToRead: asNumber(row.minutesToRead) ?? estimateMinutes(contentText),
    published: true,
  };
}

async function readWixBlogResponse(response: Response): Promise<UnknownRecord> {
  if (!response.ok) {
    throw new Error(`Wix Blog request failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  return data && typeof data === 'object' ? (data as UnknownRecord) : {};
}

export async function getPosts(lang?: Language): Promise<Post[]> {
  try {
    const query: UnknownRecord = {
      cursorPaging: { limit: 100 },
    };
    if (lang) query.filter = { language: { $eq: lang } };

    const response = await wixPublicClient.fetchWithAuth('https://www.wixapis.com/v3/posts/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fieldsets: ['CONTENT_TEXT', 'SEO', 'URL'],
        query,
      }),
    });
    const data = await readWixBlogResponse(response);
    const posts = Array.isArray(data.posts) ? data.posts : [];
    return posts
      .map((post) => mapWixBlogPost(post, lang ?? 'en'))
      .filter((post) => post.slug && !EXCLUDED_WIX_BLOG_SLUGS.has(post.slug))
      .sort((a, b) => b.pubDate.localeCompare(a.pubDate));
  } catch (error) {
    console.error('Failed to fetch posts from Wix Blog:', error);
    return [];
  }
}

export async function getPost(slug: string, lang?: Language): Promise<Post | null> {
  if (!slug || EXCLUDED_WIX_BLOG_SLUGS.has(slug)) return null;

  try {
    const params = new URLSearchParams();
    for (const fieldset of ['RICH_CONTENT', 'CONTENT_TEXT', 'SEO', 'URL']) {
      params.append('fieldsets', fieldset);
    }
    if (lang) params.set('language', lang);

    const response = await wixPublicClient.fetchWithAuth(
      `https://www.wixapis.com/v3/posts/slugs/${encodeURIComponent(slug)}?${params.toString()}`,
      { method: 'GET' }
    );
    if (response.status === 404) return null;
    const data = await readWixBlogResponse(response);
    if (!data.post) return null;

    const post = mapWixBlogPost(data.post, lang ?? 'en');
    if (lang && post.language !== lang) return null;
    return post;
  } catch (error) {
    console.error(`Failed to fetch Wix Blog post ${slug}:`, error);
    return null;
  }
}

function mapPortfolioProject(row: UnknownRecord, lang: Language): Project {
  const details = Array.isArray(row.details)
    ? row.details.filter((detail): detail is UnknownRecord => Boolean(detail) && typeof detail === 'object')
    : [];

  const tagDetail = details.find((detail) => {
    const label = asString(detail.label)?.toLowerCase();
    return label === 'technologies' || label === 'focus' || label === 'tags';
  });
  const tags = (asString(tagDetail?.text) ?? '')
    .split(/[·,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  const links: Project['links'] = {};
  for (const detail of details) {
    const label = asString(detail.label)?.toLowerCase();
    const link = detail.link && typeof detail.link === 'object' ? (detail.link as UnknownRecord) : null;
    const url = asString(link?.url);
    if (!url || !label) continue;
    if (label === 'github') links.github = url;
    if (label === 'demo' || label === 'website' || label === 'site') links.demo = url;
  }

  const imageUrl = portfolioImageUrl(row.coverImage);
  return {
    _id: asString(row._id) ?? '',
    title: asString(row.title) ?? '',
    slug: asString(row.slug) ?? '',
    language: lang,
    description: asString(row.description) ?? '',
    featuredImage: imageUrl
      ? {
          asset: {
            _id: asString(row._id) ?? '',
            url: imageUrl,
          },
        }
      : undefined,
    tags,
    links,
    featured: false,
    pubDate: asDateString(row._createdDate),
  };
}

export async function getProjects(lang: Language = 'en'): Promise<Project[]> {
  try {
    const rows = await getAll('Portfolio/Projects', 100);
    return rows
      .filter((row) => row.hidden !== true)
      .map((row) => mapPortfolioProject(row, lang))
      .sort((a, b) => (b.pubDate ?? '').localeCompare(a.pubDate ?? ''));
  } catch (error) {
    console.error('Failed to fetch projects from Wix Portfolio:', error);
    return [];
  }
}

export async function getProject(slug: string, lang: Language = 'en'): Promise<Project | null> {
  const projects = await getProjects(lang);
  return projects.find((project) => project.slug === slug) ?? null;
}

export async function getCertifications(): Promise<Certification[]> {
  try {
    const rows = await getAll('Certifications');
    return rows
      .map((row) => ({
        _id: asString(row._id) ?? '',
        name: asString(row.name) ?? '',
        issuer: asString(row.issuer) ?? '',
        status: (asString(row.status) ?? 'planned') as Certification['status'],
        iconType: asString(row.iconType) ?? 'generic',
        order: asNumber(row.displayOrder),
        credentialUrl: asString(row.credentialUrl),
      }))
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  } catch (error) {
    console.error('Failed to fetch certifications from Wix CMS:', error);
    return [];
  }
}

export async function getProfileSettings(): Promise<ProfileSettings | null> {
  try {
    const rows = await getAll('ProfileSettings', 20);
    const row = rows.find((item) => item.settingsKey === 'main') ?? rows[0];
    if (!row) return null;
    return {
      _id: asString(row._id) ?? '',
      isCurrentlyEmployed: row.isCurrentlyEmployed === true,
      cvUrl: mediaUrl(row.cvDocument),
      phone: asString(row.phone),
      github: asString(row.github),
      linkedin: asString(row.linkedin),
      twitter: asString(row.twitter),
      youtube: asString(row.youtube),
      tryhackme: asString(row.tryhackme),
      openToWorkMessage: asString(row.openToWorkMessage),
    };
  } catch (error) {
    console.error('Failed to fetch profile settings from Wix CMS:', error);
    return null;
  }
}

export async function getPageSeo(pageId: string, lang?: Language): Promise<PageSeo | null> {
  try {
    const rows = await getAll('PageSEO', 100);
    const exact = rows.find((item) => item.pageId === pageId && (!lang || item.language === lang));
    const fallback = rows.find((item) => item.pageId === pageId);
    const row = exact ?? fallback;
    if (!row) return null;
    return {
      title: asString(row.title),
      description: asString(row.description),
      keywords: Array.isArray(row.keywords) ? row.keywords.filter((v): v is string => typeof v === 'string') : undefined,
      ogImage: mediaUrl(row.ogImage),
    };
  } catch (error) {
    console.error(`Failed to fetch page SEO for ${pageId} from Wix CMS:`, error);
    return null;
  }
}

export async function getSettings() {
  try {
    const rows = await getAll('SiteSettings', 20);
    const row = rows.find((item) => item.settingsKey === 'main') ?? rows[0];
    if (!row) return null;
    return {
      title: asString(row.title),
      description: asString(row.description),
      ogImage: mediaUrl(row.ogImage) ? { asset: { url: mediaUrl(row.ogImage) } } : undefined,
      author: asString(row.defaultAuthorName) ? { name: asString(row.defaultAuthorName) } : undefined,
    };
  } catch (error) {
    console.error('Failed to fetch site settings from Wix CMS:', error);
    return null;
  }
}
