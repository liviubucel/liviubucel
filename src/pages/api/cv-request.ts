import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { env } from 'cloudflare:workers';
import { registerToken } from './cv/download';

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

async function generateToken(): Promise<string> {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  const combined = `${timestamp}-${random}-${Date.now()}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown'
  ).trim();
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
  CV_TO_EMAIL?: string;
  CV_FROM_EMAIL?: string;
  SITE_URL?: string;
}

interface CvRequest {
  fullname: string;
  email: string;
  phone: string;
  company: string;
  token: string;
  ipAddress: string;
  requestedAt: number;
  expiresAt: number;
}

interface RateLimitStore {
  [ip: string]: Array<{ timestamp: number }>;
}

const rateLimitStore: RateLimitStore = {};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  if (!rateLimitStore[ip]) {
    rateLimitStore[ip] = [];
  }

  rateLimitStore[ip] = rateLimitStore[ip].filter((req) => req.timestamp > dayAgo);

  if (rateLimitStore[ip].length >= MAX_REQUESTS_PER_DAY) {
    return false;
  }

  rateLimitStore[ip].push({ timestamp: now });
  return true;
}

export const POST: APIRoute = async (context) => {
  try {
    return await handleCvRequest(context);
  } catch (error) {
    console.error('[cv-request] Unhandled error', error);
    try {
      Sentry.captureException(error);
    } catch {
      // ignore secondary Sentry failure
    }
    return Response.json(
      { error: 'Something went wrong. Please try again or contact directly.' },
      { status: 500 },
    );
  }
};

const handleCvRequest: APIRoute = async ({ request }) => {
  const clientIp = getClientIp(request);

  if (!checkRateLimit(clientIp)) {
    return Response.json(
      { error: 'Too many requests. You can request a CV once per day. Please try again later.' },
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
  const email = sanitize((body.email ?? '').toString());
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

  const token = await generateToken();
  const now = Date.now();
  const expiresAt = now + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

  const cvRequest: CvRequest = {
    fullname,
    email,
    phone,
    company,
    token,
    ipAddress: clientIp,
    requestedAt: now,
    expiresAt,
  };

  const cfEnv = env as unknown as CloudflareEnv;

  if (!cfEnv?.EMAIL) {
    console.error('[cv-request] EMAIL binding is not configured.');
    return Response.json(
      { error: 'CV request service is temporarily unavailable. Please contact directly.' },
      { status: 503 },
    );
  }

  const toEmail = cvRequest.email;
  const fromEmail = cfEnv.CV_FROM_EMAIL ?? 'noreply@liviubucel.com';
  const siteUrl = cfEnv.SITE_URL ?? 'https://liviubucel.com';
  const downloadUrl = `${siteUrl}/api/cv/download?token=${token}`;

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
    <div class="header">
      <h1>Your CV is Ready</h1>
    </div>

    <p>Hi ${escapeHtml(fullname)},</p>

    <p>Thank you for requesting my CV. Your secure download link is ready and waiting for you.</p>

    <p><a href="${downloadUrl}" class="button">Download CV</a></p>

    <div class="notice">
      <strong>Security Notice:</strong> This link is unique to your request and expires in ${TOKEN_EXPIRY_HOURS} hours for security purposes. After expiration, you can request a new download link.
    </div>

    <p>If you have any questions about my experience or background, feel free to reach out directly.</p>

    <div class="footer">
      <p>This email was sent to you because you requested a CV from liviubucel.com. If this wasn't you, please disregard this email.</p>
      <p>Best regards,<br>Liviu Bucel</p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Your CV is Ready

Hi ${fullname},

Thank you for requesting my CV. Your secure download link is ready:

${downloadUrl}

Security Notice: This link is unique to your request and expires in ${TOKEN_EXPIRY_HOURS} hours for security purposes. After expiration, you can request a new download link.

If you have any questions about my experience or background, feel free to reach out directly.

Best regards,
Liviu Bucel

---
This email was sent to you because you requested a CV from liviubucel.com. If this wasn't you, please disregard this email.
  `;

  try {
    registerToken(token, expiresAt, email);

    await cfEnv.EMAIL.send({
      from: fromEmail,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[cv-request] CV request processed for ${email} with token ${token.substring(0, 8)}...`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[cv-request] Email send error', error);
    Sentry.captureException(error);
    return Response.json(
      { error: 'Failed to send CV download link. Please try again.' },
      { status: 502 },
    );
  }
};
