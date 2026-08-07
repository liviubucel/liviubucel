// Blog post translation backfill - selects published English posts that
// either have no Romanian counterpart or have a Romanian document whose body
// is still effectively English, translates them through the native Workers AI
// binding, and persists a proper Romanian sibling using the same slug.
//
// Before selecting candidates we also normalize safe legacy Sanity metadata
// created by the historical seed script: missing language is inferred from
// content and only known recovered public `post-*` documents are promoted to
// published when they have a date and body.

import { createClient, type SanityClient } from '@sanity/client';
import { translatePostFields, translatePostBody, type PortableTextBlock } from './translate';

interface SanityEnvConfig {
  SANITY_API_WRITE_TOKEN?: string;
  SANITY_PROJECT_ID?: string;
  PUBLIC_SANITY_PROJECT_ID?: string;
  SANITY_DATASET?: string;
}

interface BlogPostBase {
  _id: string;
  title?: string;
  description?: string;
  body?: PortableTextBlock[];
  pubDate?: string;
}

interface EnPostCandidate extends BlogPostBase {
  title: string;
  description: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
  slug: string;
  category?: unknown;
  author?: unknown;
  featuredImage?: unknown;
}

interface RoCounterpart {
  _id: string;
  slug: string;
  body?: PortableTextBlock[];
}

type FailureReason = 'fields_translation_failed' | 'body_translation_failed' | 'persist_failed';

export interface BlogBackfillResult {
  normalized: number;
  candidates: number;
  translated: number;
  repaired: number;
  partial: string[];
  failed: number;
  failedSlugs: { slug: string; reason: FailureReason }[];
}

export function getSanityWriteClient(env: Record<string, unknown>): SanityClient | null {
  const cfg = env as SanityEnvConfig;
  const writeToken = cfg.SANITY_API_WRITE_TOKEN;
  if (!writeToken) return null;

  const projectId = cfg.SANITY_PROJECT_ID || cfg.PUBLIC_SANITY_PROJECT_ID || '8atrdwjk';
  const dataset = cfg.SANITY_DATASET || 'production';

  return createClient({
    projectId,
    dataset,
    useCdn: false,
    apiVersion: '2025-02-20',
    token: writeToken,
  });
}

function bodyText(body: PortableTextBlock[] | undefined): string {
  if (!Array.isArray(body)) return '';
  return body
    .filter((block) => block?._type === 'block' && Array.isArray(block.children))
    .flatMap((block) => block.children ?? [])
    .map((child) => (typeof child?.text === 'string' ? child.text : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function romanianSignalScore(text: string): number {
  if (!text) return 0;
  const value = text.toLowerCase();
  const patterns = [
    /[ăâîșşțţ]/g,
    /\b(și|este|sunt|pentru|despre|cum|care|din|în|împotriva|securitate|vulnerabilitate|atac|ghid|după|fără|site-uri|utilizatori|date|sistem|sisteme|această|acest|prin|poate|trebuie)\b/g,
  ];

  let score = 0;
  for (const pattern of patterns) {
    score += value.match(pattern)?.length ?? 0;
  }
  return score;
}

function inferLanguage(post: BlogPostBase): 'en' | 'ro' {
  const text = `${post.title ?? ''} ${post.description ?? ''} ${bodyText(post.body)}`;
  return romanianSignalScore(text) >= 2 ? 'ro' : 'en';
}

async function normalizeLegacyBlogMetadata(client: SanityClient): Promise<number> {
  const posts = await client.fetch<
    (BlogPostBase & { language?: string; published?: boolean })[]
  >(`*[_type == "post" && (!defined(language) || !defined(published))]{
    _id, title, description, body, pubDate, language, published
  }`);

  let normalized = 0;
  for (const post of posts) {
    const patch: Record<string, unknown> = {};

    if (!post.language) {
      patch.language = inferLanguage(post);
    }

    if (
      typeof post.published !== 'boolean' &&
      post._id.startsWith('post-') &&
      post.pubDate &&
      Array.isArray(post.body) &&
      post.body.length > 0
    ) {
      patch.published = true;
    }

    if (Object.keys(patch).length === 0) continue;

    // eslint-disable-next-line no-await-in-loop
    await client.patch(post._id).set(patch).commit();
    normalized += 1;
  }

  return normalized;
}

function needsRomanianRepair(source: EnPostCandidate, target: RoCounterpart | undefined): boolean {
  if (!target) return true;

  const sourceBody = bodyText(source.body);
  const targetBody = bodyText(target.body);

  if (sourceBody && !targetBody) return true;
  if (sourceBody && targetBody && sourceBody === targetBody) return true;
  if (targetBody && romanianSignalScore(targetBody) < 2) return true;

  return false;
}

export async function backfillBlogTranslations(
  env: Record<string, unknown>,
  limit = 10,
  client: SanityClient | null = getSanityWriteClient(env)
): Promise<BlogBackfillResult> {
  if (!client) {
    console.warn('[blog] SANITY_API_WRITE_TOKEN is not configured, cannot backfill translations.');
    return {
      normalized: 0,
      candidates: 0,
      translated: 0,
      repaired: 0,
      partial: [],
      failed: 0,
      failedSlugs: [],
    };
  }

  const normalized = await normalizeLegacyBlogMetadata(client);

  const [enPosts, roPosts] = await Promise.all([
    client.fetch<EnPostCandidate[]>(
      `*[_type == "post" && published == true && language == "en"] | order(pubDate desc){
        _id, title, description, metaDescription, keywords, tags,
        "slug": slug.current, pubDate, category, author, featuredImage, body
      }`
    ),
    client.fetch<RoCounterpart[]>(
      `*[_type == "post" && published == true && language == "ro"]{
        _id, "slug": slug.current, body
      }`
    ),
  ]);

  const roBySlug = new Map(roPosts.filter((post) => post.slug).map((post) => [post.slug, post]));
  const candidates = enPosts
    .filter((post) => post.slug && needsRomanianRepair(post, roBySlug.get(post.slug)))
    .slice(0, limit);

  let translated = 0;
  let repaired = 0;
  let failed = 0;
  const failedSlugs: { slug: string; reason: FailureReason }[] = [];

  for (const post of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const fields = await translatePostFields(env, {
      title: post.title,
      description: post.description,
      metaDescription: post.metaDescription,
      keywords: post.keywords,
      tags: post.tags,
    });

    if (!fields) {
      failed += 1;
      failedSlugs.push({ slug: post.slug, reason: 'fields_translation_failed' });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const translatedBody = await translatePostBody(env, post.body);
    if (post.body?.length && translatedBody === null) {
      console.error(`[blog] refusing to publish mixed-language RO post for ${post.slug}: body translation failed.`);
      failed += 1;
      failedSlugs.push({ slug: post.slug, reason: 'body_translation_failed' });
      continue;
    }

    const translatedDocument = {
      _type: 'post' as const,
      title: fields.title,
      description: fields.description,
      metaDescription: fields.metaDescription,
      keywords: fields.keywords,
      tags: fields.tags,
      language: 'ro' as const,
      slug: { _type: 'slug' as const, current: post.slug },
      pubDate: post.pubDate,
      category: post.category,
      author: post.author,
      featuredImage: post.featuredImage,
      body: translatedBody ?? post.body,
      published: true,
    };

    try {
      const existing = roBySlug.get(post.slug);
      if (existing) {
        // eslint-disable-next-line no-await-in-loop
        await client.patch(existing._id).set(translatedDocument).commit();
        repaired += 1;
      } else {
        // eslint-disable-next-line no-await-in-loop
        const created = await client.create(translatedDocument);
        roBySlug.set(post.slug, { _id: created._id, slug: post.slug, body: translatedDocument.body });
        translated += 1;
      }
    } catch (error) {
      console.error(`[blog] failed to persist RO translation for ${post.slug}:`, error);
      failed += 1;
      failedSlugs.push({ slug: post.slug, reason: 'persist_failed' });
    }
  }

  return {
    normalized,
    candidates: candidates.length,
    translated,
    repaired,
    partial: [],
    failed,
    failedSlugs,
  };
}
