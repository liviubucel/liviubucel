// Blog post RO translation trigger - runs entirely inside this Worker via
// the native Workers AI binding and a Sanity write token, so it doesn't
// depend on GitHub Actions (unlike scripts/translate-blog-posts.mjs, which
// this endpoint is meant to replace as the primary path). Safe to call
// repeatedly: only ever selects EN posts still missing a RO counterpart.
//
// Intended to be called either manually (curl, like the cyber-monitor
// trigger endpoints) or automatically from a Sanity webhook configured to
// fire on `post` document publish - see docs/blog-translate-webhook.md.

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { backfillBlogTranslations } from '../../../lib/blog/backfill-translations';

export const prerender = false;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const POST: APIRoute = async ({ request }) => {
  const expectedToken = (env as unknown as { BLOG_TRANSLATE_TRIGGER_TOKEN?: string }).BLOG_TRANSLATE_TRIGGER_TOKEN;
  if (!expectedToken) {
    return Response.json({ error: 'trigger_not_configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!providedToken || !timingSafeEqual(providedToken, expectedToken)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 20) : 5;

  const result = await backfillBlogTranslations(env as unknown as Record<string, unknown>, limit);

  return Response.json(result, { status: 200 });
};
