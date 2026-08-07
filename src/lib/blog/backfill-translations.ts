// Blog post translation backfill - selects every published English post
// with no published Romanian counterpart yet and translates it via
// Cloudflare Workers AI, then publishes the result as a sibling Sanity
// document using the same slug and language:'ro'.
//
// A Romanian document is published only when both metadata and body
// translation complete successfully. We never publish an English body under
// a Romanian URL because that hides translation failures and produces
// misleading language metadata.

import { createClient, type SanityClient } from '@sanity/client';
import { translatePostFields, translatePostBody, type PortableTextBlock } from './translate';

interface SanityEnvConfig {
  SANITY_API_WRITE_TOKEN?: string;
  SANITY_PROJECT_ID?: string;
  PUBLIC_SANITY_PROJECT_ID?: string;
  SANITY_DATASET?: string;
}

interface EnPostCandidate {
  _id: string;
  title: string;
  description: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
  slug: string;
  pubDate?: string;
  category?: unknown;
  author?: unknown;
  featuredImage?: unknown;
  body?: PortableTextBlock[];
}

type FailureReason = 'fields_translation_failed' | 'body_translation_failed' | 'persist_failed';

export interface BlogBackfillResult {
  candidates: number;
  translated: number;
  /** Kept for backwards-compatible API responses. Partial mixed-language
   * publications are no longer created, so this is always empty. */
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

export async function backfillBlogTranslations(
  env: Record<string, unknown>,
  limit = 10,
  client: SanityClient | null = getSanityWriteClient(env)
): Promise<BlogBackfillResult> {
  if (!client) {
    console.warn('[blog] SANITY_API_WRITE_TOKEN is not configured, cannot backfill translations.');
    return { candidates: 0, translated: 0, partial: [], failed: 0, failedSlugs: [] };
  }

  const [enPosts, roSlugs] = await Promise.all([
    client.fetch<EnPostCandidate[]>(
      `*[_type == "post" && published == true && language == "en"]{
        _id, title, description, metaDescription, keywords, tags,
        "slug": slug.current, pubDate, category, author, featuredImage, body
      }`
    ),
    client.fetch<string[]>(`*[_type == "post" && published == true && language == "ro"].slug.current`),
  ]);

  const roSlugSet = new Set(roSlugs);
  const candidates = enPosts.filter((post) => post.slug && !roSlugSet.has(post.slug)).slice(0, limit);

  let translated = 0;
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

    try {
      // eslint-disable-next-line no-await-in-loop
      await client.create({
        _type: 'post',
        title: fields.title,
        description: fields.description,
        metaDescription: fields.metaDescription,
        keywords: fields.keywords,
        tags: fields.tags,
        language: 'ro',
        slug: { _type: 'slug', current: post.slug },
        pubDate: post.pubDate,
        category: post.category,
        author: post.author,
        featuredImage: post.featuredImage,
        body: translatedBody ?? post.body,
        published: true,
      });
      translated += 1;
    } catch (error) {
      console.error(`[blog] failed to persist RO translation for ${post.slug}:`, error);
      failed += 1;
      failedSlugs.push({ slug: post.slug, reason: 'persist_failed' });
    }
  }

  return { candidates: candidates.length, translated, partial: [], failed, failedSlugs };
}
