// Romania Cyber Monitor - newsletter confirm-subscription link target.
// GET only (it's a link clicked from an email, not a form submission).

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    return redirect('/?newsletter=invalid', 302);
  }

  const db = env.ROMANIA_MONITOR_DB;

  const subscriber = await db
    .prepare('SELECT id, status FROM newsletter_subscribers WHERE confirm_token = ?1')
    .bind(token)
    .first<{ id: string; status: string }>();

  if (!subscriber) {
    return redirect('/?newsletter=invalid', 302);
  }

  if (subscriber.status === 'pending') {
    await db
      .prepare(`UPDATE newsletter_subscribers SET status = 'confirmed', confirmed_at = ?1 WHERE id = ?2`)
      .bind(new Date().toISOString(), subscriber.id)
      .run();
  }

  return redirect('/?newsletter=confirmed', 302);
};
