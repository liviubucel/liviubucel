import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { env } from 'cloudflare:workers';
import { isTokenValid, consumeToken } from '../../../lib/cv-tokens';
import { getProfileSettings } from '../../../lib/sanity-queries';

export const prerender = false;

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

interface CloudflareEnv {
  ROMANIA_MONITOR_DB?: D1Database;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');
    if (!token || !TOKEN_PATTERN.test(token)) {
      return Response.json(
        { error: 'Invalid or expired token. Please request a new CV download link.' },
        { status: 410 },
      );
    }

    const db = (env as unknown as CloudflareEnv).ROMANIA_MONITOR_DB;
    if (!db) {
      console.error('[cv-download] Required database binding is not configured.');
      return Response.json(
        { error: 'CV file is currently unavailable. Please contact directly.' },
        { status: 503 },
      );
    }

    if (!(await isTokenValid(db, token))) {
      return Response.json(
        { error: 'Invalid or expired token. Please request a new CV download link.' },
        { status: 410 },
      );
    }

    const profile = await getProfileSettings();
    const cvUrl = profile?.cvUrl;
    if (!cvUrl) {
      console.error('[cv-download] CV file is not configured.');
      return Response.json(
        { error: 'CV file is currently unavailable. Please contact directly.' },
        { status: 503 },
      );
    }

    const assetResponse = await fetch(cvUrl);
    if (!assetResponse.ok || !assetResponse.body) {
      console.error('[cv-download] CV file fetch failed.');
      return Response.json(
        { error: 'CV file is currently unavailable. Please contact directly.' },
        { status: 503 },
      );
    }

    // Atomically consume the token only after the asset is available. If two
    // requests race, only the first successful UPDATE is allowed to return it.
    if (!(await consumeToken(db, token))) {
      await assetResponse.body.cancel().catch(() => undefined);
      return Response.json(
        { error: 'Invalid or expired token. Please request a new CV download link.' },
        { status: 410 },
      );
    }

    return new Response(assetResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Liviu-Bucel-CV.pdf"',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[cv-download] Unhandled error.');
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
