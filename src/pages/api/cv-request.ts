import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { wixPublicClient } from '../../lib/wix/client';

export const prerender = false;

const WIX_CV_REQUEST_FORM_ID = '151bf70f-f501-4f9d-8dd5-28e2e54dde5f';
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

// eslint-disable-next-line no-control-regex
function sanitize(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, '').trim();
}

export const POST: APIRoute = async (context) => {
  try {
    return await handleCvRequest(context);
  } catch (error) {
    console.error('[cv-request] Unhandled Wix Forms error');
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
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request format.' }, { status: 400 });
  }

  const fullname = sanitize((body.fullname ?? '').toString());
  const email = sanitize((body.email ?? '').toString()).toLowerCase();
  const terms = Boolean(body.terms);

  if (!fullname || !email) {
    return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  if (!terms) {
    return Response.json({ error: 'Please agree to the privacy policy.' }, { status: 400 });
  }

  if (fullname.length > MAX_NAME_LENGTH || email.length > MAX_EMAIL_LENGTH) {
    return Response.json({ error: 'One of the fields is too long.' }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const response = await wixPublicClient.fetchWithAuth(
    'https://www.wixapis.com/forms/v4/submissions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission: {
          formId: WIX_CV_REQUEST_FORM_ID,
          submissions: {
            full_name: fullname,
            email,
            privacy_consent: true,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error(
      `[cv-request] Wix Forms submission failed with HTTP ${response.status}`,
      details.slice(0, 500),
    );
    return Response.json(
      { error: 'CV request service is temporarily unavailable. Please try again later.' },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    submission?: { id?: string; status?: string };
  };

  if (!data.submission?.id) {
    console.error('[cv-request] Wix Forms returned no submission ID.');
    return Response.json(
      { error: 'CV request service is temporarily unavailable. Please try again later.' },
      { status: 502 },
    );
  }

  // Wix Forms is the system of record for CV requests. Access to the current
  // CV is resolved server-side from Wix CMS so the frontend never hardcodes a
  // Media Manager or File Share URL.
  return Response.json({
    success: true,
    downloadUrl: '/api/cv/download',
  });
};
