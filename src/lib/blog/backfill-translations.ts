// Blog post translation backfill - selects every published English post
// with no published Romanian counterpart yet and translates it via
// Cloudflare Workers AI (translatePostFields/translatePostBody), then
// publishes the result as a sibling Sanity document (same slug,
// language: 'ro'). Safe to call repeatedly/on a schedule: only ever
// selects EN posts still missing a RO counterpart.
//
// Runs entirely inside the Worker via the native `env.AI` binding and a
// Sanity write token passed through `env` - no GitHub Actions run needed.

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

export interface BlogBackfillResult {
  candidates: number;
  translated: number;
  failed: number;
  failedSlugs: string[];
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
    return { candidates: 0, translated: 0, failed: 0, failedSlugs: [] };
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
  const failedSlugs: string[] = [];

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
      failedSlugs.push(post.slug);
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const body = await translatePostBody(env, post.body);
    if (!body) {
      failed += 1;
      failedSlugs.push(post.slug);
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
        body,
        published: true,
      });
      translated += 1;
    } catch (error) {
      console.error(`[blog] failed to persist RO translation for ${post.slug}:`, error);
      failed += 1;
      failedSlugs.push(post.slug);
    }
  }

  return { candidates: candidates.length, translated, failed, failedSlugs };
}
