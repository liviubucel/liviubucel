// Romania Cyber Monitor - newsletter subscribe endpoint. Double opt-in:
// this only ever creates a 'pending' row and sends a confirmation email:
// nothing is added to the digest recipient list until the link in that
// email is clicked (see confirm.ts).

import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { env } from 'cloudflare:workers';
import { newsletterConfirmationEmail } from '../../../lib/newsletter/templates';
import { generateToken } from '../../../lib/newsletter/tokens';

export const prerender = false;

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

interface CloudflareEnv {
  ROMANIA_MONITOR_DB: D1Database;
  EMAIL?: {
    send: (opts: { from: string; to: string; subject: string; text: string; html: string }) => Promise<void>;
  };
  NEWSLETTER_FROM_EMAIL?: string;
  SITE_URL?: string;
}

export const POST: APIRoute = async (context) => {
  try {
    return await handleSubscribe(context);
  } catch (error) {
    console.error('[newsletter] Unhandled subscribe error', error);
    try {
      Sentry.captureException(error);
    } catch {
      // ignore secondary Sentry failure
    }
    return Response.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
};

const handleSubscribe: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = (formData.get('email') ?? '').toString().trim().toLowerCase();

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return Response.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const cfEnv = env as unknown as CloudflareEnv;
  const db = cfEnv.ROMANIA_MONITOR_DB;

  const existing = await db
    .prepare('SELECT id, status, confirm_token FROM newsletter_subscribers WHERE email = ?1')
    .bind(email)
    .first<{ id: string; status: string; confirm_token: string }>();

  let confirmToken: string;

  if (existing) {
    if (existing.status === 'confirmed') {
      return Response.json({ success: true, alreadySubscribed: true });
    }
    // Already pending or previously unsubscribed - resend a fresh
    // confirmation and (re)set status to pending either way.
    confirmToken = generateToken();
    await db
      .prepare(`UPDATE newsletter_subscribers SET status = 'pending', confirm_token = ?1 WHERE id = ?2`)
      .bind(confirmToken, existing.id)
      .run();
  } else {
    confirmToken = generateToken();
    const unsubscribeToken = generateToken();
    await db
      .prepare(
        `INSERT INTO newsletter_subscribers (id, email, status, confirm_token, unsubscribe_token)
         VALUES (?1, ?2, 'pending', ?3, ?4)`
      )
      .bind(crypto.randomUUID(), email, confirmToken, unsubscribeToken)
      .run();
  }

  if (!cfEnv.EMAIL) {
    console.error('[newsletter] EMAIL binding is not configured.');
    return Response.json(
      { success: false, error: 'Subscriptions are temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  const siteUrl = (cfEnv.SITE_URL ?? 'https://liviubucel.com/').replace(/\/$/, '');
  const confirmUrl = `${siteUrl}/api/newsletter/confirm?token=${confirmToken}`;
  const fromEmail = cfEnv.NEWSLETTER_FROM_EMAIL ?? 'newsletter@liviubucel.com';
  const { subject, text, html } = newsletterConfirmationEmail(confirmUrl);

  try {
    await cfEnv.EMAIL.send({ from: fromEmail, to: email, subject, text, html });
  } catch (error) {
    console.error('[newsletter] confirmation email error', error);
    Sentry.captureException(error);
    return Response.json(
      { success: false, error: 'Something went wrong sending the confirmation email. Please try again.' },
      { status: 502 },
    );
  }

  return Response.json({ success: true });
};
