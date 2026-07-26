// Romania Cyber Monitor - one-click unsubscribe link target (from the
// footer of every digest email). GET only, no login required by design.

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    return redirect('/?newsletter=invalid', 302);
  }

  const db = env.ROMANIA_MONITOR_DB;

  await db
    .prepare(`UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = ?1 WHERE unsubscribe_token = ?2`)
    .bind(new Date().toISOString(), token)
    .run();

  return redirect('/?newsletter=unsubscribed', 302);
};
