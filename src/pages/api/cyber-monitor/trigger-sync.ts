// Romania Cyber Monitor - manual ops trigger.
//
// Runs the exact same sync path the Worker's cron already runs
// automatically every 6/12 hours (fetch -> validate -> normalise -> D1
// dedup-gated persist -> auto-generate+publish article for newly published
// incidents). This exists purely so an operator can run today's first
// batch on demand instead of waiting for the next scheduled tick; it has
// no destructive capability - the D1 lock and dedup keys make it safe to
// call repeatedly or even concurrently with the real cron.
//
// Auth is a single shared token compared in constant time (see
// timingSafeEqual below), set as an encrypted Wrangler secret - never as a
// plaintext wrangler.toml var:
//   npx wrangler secret put CYBER_MONITOR_TRIGGER_TOKEN
// Rotate by running that command again with a new value.

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { runScheduledSources } from '../../../lib/cyber-monitor/scheduled-handler';

export const prerender = false;

// The two sources that require no API key and run unconditionally in
// production today. Deliberately not the other six (LeakIX, ThreatFox,
// URLhaus, MalwareBazaar, MISP, ENISA CIRAS) - those are disabled pending
// credentials and would just log a skipped_not_configured run for nothing.
const MANUAL_TRIGGER_SOURCES = ['ransomware_live', 'hibp'] as const;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const POST: APIRoute = async ({ request }) => {
  // Not part of the generated Env type: wrangler.toml never declares
  // encrypted secrets, only plaintext vars, so `wrangler types` can't see it.
  const expectedToken = (env as unknown as { CYBER_MONITOR_TRIGGER_TOKEN?: string }).CYBER_MONITOR_TRIGGER_TOKEN;
  if (!expectedToken) {
    return Response.json({ error: 'trigger_not_configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!providedToken || !timingSafeEqual(providedToken, expectedToken)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await runScheduledSources(
    [...MANUAL_TRIGGER_SOURCES],
    env.ROMANIA_MONITOR_DB,
    env as unknown as Record<string, unknown>,
    () => new Date(),
    'manual'
  );

  return Response.json(result, { status: 200 });
};
