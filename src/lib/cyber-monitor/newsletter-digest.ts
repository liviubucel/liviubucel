// Romania Cyber Monitor - sends one digest email per sync run to every
// confirmed newsletter subscriber, covering everything that was newly
// published in that run. Never one email per incident - a single sync can
// legitimately publish dozens of incidents at once (e.g. a source's first
// run, or a source backfilling its history), and that must never turn
// into dozens of separate emails to every subscriber.

import { newsletterDigestEmail, type DigestItem } from '../newsletter/templates';

export type { DigestItem };

interface EmailBinding {
  send(message: { from: string; to: string; subject: string; text: string; html: string }): Promise<void>;
}

export async function sendNewsletterDigest(
  db: D1Database,
  env: Record<string, unknown>,
  items: DigestItem[]
): Promise<void> {
  if (items.length === 0) return;

  const emailBinding = env.EMAIL as EmailBinding | undefined;
  if (!emailBinding) {
    console.error('[newsletter] EMAIL binding is not configured, skipping digest.');
    return;
  }

  const fromEmail = (env.NEWSLETTER_FROM_EMAIL as string | undefined) ?? 'newsletter@liviubucel.com';
  const siteUrl = (env.SITE_URL as string | undefined) ?? 'https://liviubucel.com/';

  const { results: subscribers } = await db
    .prepare(`SELECT email, unsubscribe_token FROM newsletter_subscribers WHERE status = 'confirmed'`)
    .all<{ email: string; unsubscribe_token: string }>();

  if (!subscribers || subscribers.length === 0) return;

  for (const subscriber of subscribers) {
    const unsubscribeUrl = `${siteUrl.replace(/\/$/, '')}/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;
    const { subject, text, html } = newsletterDigestEmail(items, unsubscribeUrl);

    try {
      // eslint-disable-next-line no-await-in-loop
      await emailBinding.send({ from: fromEmail, to: subscriber.email, subject, text, html });
    } catch (error) {
      // One subscriber's failure (bounced address, etc.) never blocks the rest.
      console.error('[newsletter] failed to send digest to a subscriber:', error);
    }
  }
}
