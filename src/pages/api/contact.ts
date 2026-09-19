import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { wixPublicClient } from '../../lib/wix/client';

export const prerender = false;

const WIX_CONTACT_FORM_ID = '37a2f450-fd7e-4086-a16d-569758a75910';
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
const VALID_TOPICS = new Set([
  'Security Research',
  'Collaboration',
  'Career Opportunity',
  'CTF / Challenge',
  'General Question',
]);
const MAX_LENGTH = { name: 100, email: 254, topic: 50, message: 5000 } as const;

// eslint-disable-next-line no-control-regex
function sanitize(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, '').trim();
}

export const POST: APIRoute = async (context) => {
  try {
    return await handleContactSubmission(context);
  } catch (error) {
    console.error('[contact] Unhandled Wix Forms error');
    try { Sentry.captureException(error); } catch {}
    return Response.json(
      { success: false, error: 'Something went wrong. Please try again or email directly.' },
      { status: 500 },
    );
  }
};

const handleContactSubmission: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const name = sanitize((formData.get('name') ?? '').toString());
  const email = sanitize((formData.get('email') ?? '').toString()).toLowerCase();
  const rawTopic = sanitize((formData.get('topic') ?? '').toString());
  const topic = VALID_TOPICS.has(rawTopic) ? rawTopic : '';
  const message = sanitize((formData.get('message') ?? '').toString());
  const consent = Boolean(formData.get('consent'));

  if (!name || !email || !message) {
    return Response.json({ success: false, error: 'Please fill in all required fields.' }, { status: 400 });
  }
  if (!consent) {
    return Response.json({ success: false, error: 'You must agree to the privacy policy to send a message.' }, { status: 400 });
  }
  if (
    name.length > MAX_LENGTH.name ||
    email.length > MAX_LENGTH.email ||
    topic.length > MAX_LENGTH.topic ||
    message.length > MAX_LENGTH.message
  ) {
    return Response.json({ success: false, error: 'One of the fields is too long.' }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const response = await wixPublicClient.fetchWithAuth(
    'https://www.wixapis.com/forms/v4/submissions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission: {
          formId: WIX_CONTACT_FORM_ID,
          submissions: {
            full_name: name,
            email,
            ...(topic ? { topic } : {}),
            message,
            privacy_consent: true,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error(`[contact] Wix Forms submission failed with HTTP ${response.status}`, details.slice(0, 500));
    return Response.json(
      { success: false, error: 'Contact form is temporarily unavailable. Please email directly.' },
      { status: 502 },
    );
  }

  const data = (await response.json()) as { submission?: { id?: string; status?: string } };
  if (!data.submission?.id) {
    console.error('[contact] Wix Forms returned no submission ID.');
    return Response.json(
      { success: false, error: 'Contact form is temporarily unavailable. Please email directly.' },
      { status: 502 },
    );
  }

  // Wix Forms is now the system of record. The active Wix automation
  // "New submission received for Contact" notifies the site owner.
  return Response.json({ success: true });
};
