import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { env } from 'cloudflare:workers';
import { issueToken } from '../../lib/cv-tokens';

export const prerender = false;

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^[\d\s\-\+\(\)]{7,}$/;

const MAX_LENGTH = {
  fullname: 100,
  email: 254,
  phone: 20,
  company: 100,
} as const;

const MAX_REQUESTS_PER_DAY = 3;
const TOKEN_EXPIRY_HOURS = 24;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// eslint-disable-next-line no-control-regex
function sanitize(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, '').trim();
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown'
  ).trim();
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashRateLimitKey(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`cv-request-rate-limit:${ip}`),
  );
  return toHex(new Uint8Array(digest));
}

async function checkRateLimit(db: D1Database, ip: string): Promise<boolean> {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const ipHash = await hashRateLimitKey(ip);

  await db.prepare('DELETE FROM cv_request_rate_limits WHERE requested_at < ?').bind(cutoff).run();

  const result = await db
    .prepare(
      `INSERT INTO cv_request_rate_limits (ip_hash, requested_at)
       SELECT ?, ?
       WHERE (
         SELECT COUNT(*)
         FROM cv_request_rate_limits
         WHERE ip_hash = ? AND requested_at >= ?
       ) < ?`,
    )
    .bind(ipHash, now, ipHash, cutoff, MAX_REQUESTS_PER_DAY)
    .run();

  return (result.meta?.changes ?? 0) === 1;
}

interface CloudflareEnv {
  EMAIL?: {
    send: (opts: {
      from: string;
      to: string;
      replyTo?: string;
      subject: string;
      text: string;
      html: string;
    }) => Promise<void>;
  };
  ROMANIA_MONITOR_DB?: D1Database;
  CV_FROM_EMAIL?: string;
  SITE_URL?: string;
}

export const POST: APIRoute = async (context) => {
  try {
    return await handleCvRequest(context);
  } catch (error) {
    console.error('[cv-request] Unhandled error');
    try {
      Sentry.captureException(error);
    } catch {
      // Ignore secondary telemetry failure.
    }
    return Response.json(
      { error: 'Something went wrong. Please try again or contact directly.' },
      { status: 500 },
    );
  }
};

const handleCvRequest: APIRoute = async ({ request }) => {
  const cfEnv = env as unknown as CloudflareEnv;

  if (!cfEnv.EMAIL || !cfEnv.ROMANIA_MONITOR_DB) {
    console.error('[cv-request] Required service binding is not configured.');
    return Response.json(
      { error: 'CV request service is temporarily unavailable. Please contact directly.' },
      { status: 503 },
    );
  }

  const clientIp = getClientIp(request);
  if (!(await checkRateLimit(cfEnv.ROMANIA_MONITOR_DB, clientIp))) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request format.' }, { status: 400 });
  }

  const fullname = sanitize((body.fullname ?? '').toString());
  const email = sanitize((body.email ?? '').toString()).toLowerCase();
  const phone = sanitize((body.phone ?? '').toString());
  const company = sanitize((body.company ?? '').toString());
  const terms = Boolean(body.terms);

  if (!fullname || !email) {
    return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  if (!terms) {
    return Response.json({ error: 'Please agree to the terms.' }, { status: 400 });
  }

  if (
    fullname.length > MAX_LENGTH.fullname ||
    email.length > MAX_LENGTH.email ||
    (phone && phone.length > MAX_LENGTH.phone) ||
    (company && company.length > MAX_LENGTH.company)
  ) {
    return Response.json({ error: 'One of the fields is too long.' }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    return Response.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
  }

  const expiresAt = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  const token = await issueToken(cfEnv.ROMANIA_MONITOR_DB, email, expiresAt);

  const fromEmail = cfEnv.CV_FROM_EMAIL ?? 'noreply@liviubucel.com';
  const siteUrl = cfEnv.SITE_URL ?? 'https://www.liviubucel.com';
  const downloadUrl = `${siteUrl}/api/cv/download?token=${encodeURIComponent(token)}`;

  const subject = 'Your CV is Ready for Download';
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .button { display: inline-block; background: #fff; color: #333; padding: 12px 24px; text-decoration: none; border: 1px solid #ddd; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    .notice { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Your CV is Ready</h1></div>
    <p>Hi ${escapeHtml(fullname)},</p>
    <p>Thank you for requesting my CV. Your secure download link is ready.</p>
    <p><a href="${downloadUrl}" class="button">Download CV</a></p>
    <div class="notice">
      <strong>Security Notice:</strong> This link is unique, can be used once, and expires in ${TOKEN_EXPIRY_HOURS} hours.
    </div>
    <p>If you have any questions about my experience or background, feel free to reach out directly.</p>
    <div class="footer">
      <p>This email was sent because a CV was requested from liviubucel.com. If this wasn't you, please disregard it.</p>
      <p>Best regards,<br>Liviu Bucel</p>
    </div>
  </div>
</body>
</html>`;

  const textContent = `Your CV is Ready\n\nHi ${fullname},\n\nYour secure CV download link is ready:\n\n${downloadUrl}\n\nThis one-use link expires in ${TOKEN_EXPIRY_HOURS} hours.\n\nBest regards,\nLiviu Bucel`;

  try {
    await cfEnv.EMAIL.send({
      from: fromEmail,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('[cv-request] CV request processed successfully.');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[cv-request] Email send failed.');
    Sentry.captureException(error);
    return Response.json(
      { error: 'Failed to send CV download link. Please try again.' },
      { status: 502 },
    );
  }
};
