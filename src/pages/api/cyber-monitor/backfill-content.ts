// Romania Cyber Monitor - manual backfill trigger for article content.
// Regenerates already-published article bodies with the current template
// (threat-group/sector context, guidance sections, contact CTA) - template
// improvements otherwise only ever reach newly-published incidents. Safe to
// call repeatedly; processes at most `limit` per call.
//
// Reuses the same auth token as trigger-sync.ts (CYBER_MONITOR_TRIGGER_TOKEN).

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { backfillArticleContent } from '../../../lib/cyber-monitor/backfill-article-content';

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
  const expectedToken = (env as unknown as { CYBER_MONITOR_TRIGGER_TOKEN?: string }).CYBER_MONITOR_TRIGGER_TOKEN;
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
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

  const result = await backfillArticleContent(env.ROMANIA_MONITOR_DB, env as unknown as Record<string, unknown>, limit);

  return Response.json(result, { status: 200 });
};
