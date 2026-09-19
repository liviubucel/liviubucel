import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { getProfileSettings } from '../../../lib/content-queries';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const profile = await getProfileSettings();
    const cvUrl = profile?.cvUrl;

    if (!cvUrl) {
      console.error('[cv-download] CV file is not configured in Wix.');
      return Response.json(
        { error: 'CV file is currently unavailable. Please contact directly.' },
        { status: 503 },
      );
    }

    // Keep the public route stable while Wix remains the source of truth.
    // Today cvUrl points at Wix Media Manager; after the CV is added to the
    // official Wix File Share app, the same CMS field can point at its share
    // URL without another frontend change.
    return new Response(null, {
      status: 302,
      headers: {
        Location: cvUrl,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[cv-download] Unhandled Wix CV lookup error.');
    try {
      Sentry.captureException(error);
    } catch {
      // Ignore secondary telemetry failure.
    }
    return Response.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
};
