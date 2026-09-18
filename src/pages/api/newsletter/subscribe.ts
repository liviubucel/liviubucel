// Romania Cyber Monitor newsletter subscribe endpoint.
//
// Wix Forms is the source of truth. The form is configured for native
// DOUBLE_CONFIRMATION, so a public Headless submission may initially return
// PENDING while Wix runs spam screening and its post-submission pipeline.
// Wix then creates/updates the marketing consent as PENDING until the visitor
// confirms via Wix's subscription-confirmation email.

import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { wixPublicClient } from '../../../lib/wix/client';

export const prerender = false;

const WIX_NEWSLETTER_FORM_ID = '4b8cab43-1038-4982-bd52-a1fe3553a0a6';
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

export const POST: APIRoute = async (context) => {
  try {
    return await handleSubscribe(context);
  } catch (error) {
    console.error('[newsletter] Unhandled Wix subscribe error');
    try {
      Sentry.captureException(error);
    } catch {
      // Ignore secondary telemetry failure.
    }
    return Response.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
};

const handleSubscribe: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = (formData.get('email') ?? '').toString().trim().toLowerCase();
  const consent = formData.get('consent');

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return Response.json(
      { success: false, error: 'Please enter a valid email address.' },
      { status: 400 },
    );
  }

  if (!consent) {
    return Response.json(
      { success: false, error: 'You must agree to the privacy policy to subscribe.' },
      { status: 400 },
    );
  }

  const response = await wixPublicClient.fetchWithAuth(
    'https://www.wixapis.com/forms/v4/submissions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submission: {
          formId: WIX_NEWSLETTER_FORM_ID,
          submissions: {
            email,
            email_subscription: true,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error(
      `[newsletter] Wix Forms submission failed with HTTP ${response.status}`,
      details.slice(0, 500),
    );
    return Response.json(
      { success: false, error: 'Subscriptions are temporarily unavailable. Please try again later.' },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    submission?: {
      id?: string;
      status?: string;
    };
  };

  const submissionId = data.submission?.id;
  const status = data.submission?.status;

  if (!submissionId || (status !== 'PENDING' && status !== 'CONFIRMED')) {
    console.error('[newsletter] Wix Forms returned an unexpected submission state.');
    return Response.json(
      { success: false, error: 'Subscriptions are temporarily unavailable. Please try again later.' },
      { status: 502 },
    );
  }

  // PENDING is expected for public Headless submissions while Wix performs
  // spam screening. The Wix Forms post-submission flow creates a
  // DOUBLE_CONFIRMATION marketing consent and sends the confirmation email.
  return Response.json({ success: true });
};
