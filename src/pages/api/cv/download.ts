import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { isTokenValid, consumeToken } from '../../../lib/cv-tokens';
import { getProfileSettings } from '../../../lib/sanity-queries';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');

    if (!token) {
      return Response.json(
        { error: 'Missing token. Please use the download link from your email.' },
        { status: 400 },
      );
    }

    if (!isTokenValid(token)) {
      return Response.json(
        { error: 'Invalid or expired token. Please request a new CV download link.' },
        { status: 410 },
      );
    }

    try {
      const profile = await getProfileSettings();
      const cvUrl = profile?.cvUrl;

      if (!cvUrl) {
        console.error('[cv-download] CV file is not configured in Sanity.');
        return Response.json(
          { error: 'CV file is currently unavailable. Please contact directly.' },
          { status: 503 },
        );
      }

      const assetResponse = await fetch(cvUrl);

      if (!assetResponse.ok) {
        console.error('[cv-download] CV file fetch failed', assetResponse.status);
        return Response.json(
          { error: 'CV file is currently unavailable. Please contact directly.' },
          { status: 503 },
        );
      }

      consumeToken(token);

      return new Response(assetResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="Liviu-Bucel-CV.pdf"',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    } catch (fileError) {
      console.error('[cv-download] CV file not found', fileError);
      return Response.json(
        { error: 'CV file is currently unavailable. Please contact directly.' },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error('[cv-download] Unhandled error', error);
    try {
      Sentry.captureException(error);
    } catch {
      // ignore secondary Sentry failure
    }
    return Response.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
};
