import { wixPublicClient } from './wix/client';
import type { Language } from './i18n';

// Transitional content facade. Public profile/SEO/certification data now comes
// from Wix CMS, while content types that have not yet completed their frontend
// renderer migration continue to use Sanity behind this single compatibility
// boundary. Consumers no longer need to know which backend owns a content type.
export {
  getPosts,
  getPost,
  getProjects,
  getProject,
  getCategories,
  getAuthors,
  getGuestbookEntries,
  submitGuestbookEntry,
} from './sanity-queries';
export type { Post, Project, Author, Category } from './sanity-queries';

type UnknownRecord = Record<string, unknown>;

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

function mediaUrl(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const url = (value as UnknownRecord).url;
    if (typeof url === 'string' && url.trim()) return url;
  }
  return undefined;
}

async function getAll(collectionId: string, limit = 1000): Promise<UnknownRecord[]> {
  const result = await wixPublicClient.items.query(collectionId).limit(limit).find();
  return (result.items ?? []).map(unwrapDataItem);
}

async function getOne(collectionId: string): Promise<UnknownRecord | null> {
  const rows = await getAll(collectionId, 1);
  return rows[0] ?? null;
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
