import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { contactConfirmationEmail } from '../../lib/contact/templates';

export const prerender = false;

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

const VALID_TOPICS = new Set([
  'Security Research',
  'Collaboration',
  'Career Opportunity',
  'CTF / Challenge',
  'General Question',
]);

const MAX_LENGTH = {
  name: 100,
  email: 254,
  topic: 50,
  message: 5000,
} as const;

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
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
}

export const POST: APIRoute = async (context) => {
  try {
    return await handleContactSubmission(context);
  } catch (error) {
    console.error('[contact] Unhandled error', error);
    try {
      Sentry.captureException(error);
    } catch {
      // ignore secondary Sentry failure
    }
    return Response.json(
      { success: false, error: 'Something went wrong. Please try again or email directly.' },
      { status: 500 },
    );
  }
};

const handleContactSubmission: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();

  const name = sanitize((formData.get('name') ?? '').toString());
  const email = sanitize((formData.get('email') ?? '').toString());
  const rawTopic = sanitize((formData.get('topic') ?? '').toString());
  const topic = VALID_TOPICS.has(rawTopic) ? rawTopic : '';
  const message = sanitize((formData.get('message') ?? '').toString());

  if (!name || !email || !message) {
    return Response.json(
      { success: false, error: 'Please fill in all required fields.' },
      { status: 400 },
    );
  }

  if (
    name.length > MAX_LENGTH.name ||
    email.length > MAX_LENGTH.email ||
    topic.length > MAX_LENGTH.topic ||
    message.length > MAX_LENGTH.message
  ) {
    return Response.json(
      { success: false, error: 'One of the fields is too long.' },
      { status: 400 },
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return Response.json(
      { success: false, error: 'Please enter a valid email address.' },
      { status: 400 },
    );
  }

  const runtime = (locals as { runtime?: { env: CloudflareEnv } }).runtime;
  const cfEnv = runtime?.env;

  if (!cfEnv?.EMAIL) {
    console.error('contact: EMAIL binding is not configured.');
    return Response.json(
      { success: false, error: 'Contact form is temporarily unavailable. Please email directly.' },
      { status: 503 },
    );
  }

  const toEmail = cfEnv.CONTACT_TO_EMAIL ?? 'contact@liviubucel.com';
  const fromEmail = cfEnv.CONTACT_FROM_EMAIL ?? 'noreply@liviubucel.com';

  const subject = `New message from liviubucel.com${topic ? ` — ${topic}` : ''}`;
  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    topic && `Topic: ${topic}`,
    '',
    'Message:',
    message,
  ].filter(Boolean);
  const text = lines.join('\n');
  const html = lines
    .map((line) => `<p>${escapeHtml(String(line)).replace(/\n/g, '<br>')}</p>`)
    .join('');

  try {
    await cfEnv.EMAIL.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error('[contact] Email send error', error);
    Sentry.captureException(error);
    return Response.json(
      { success: false, error: 'Something went wrong. Please try again or email directly.' },
      { status: 502 },
    );
  }

  // Auto-response — best effort, failure doesn't block the success response
  try {
    const confirmation = contactConfirmationEmail(name, message);
    await cfEnv.EMAIL.send({
      from: fromEmail,
      to: email,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
    });
  } catch (error) {
    console.error('[contact] Confirmation email error', error);
    Sentry.captureException(error);
  }

  return Response.json({ success: true });
};
