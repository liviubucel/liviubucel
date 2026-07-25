import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { env } from 'cloudflare:workers';
import { isTokenValid, consumeToken } from '../../../lib/cv-tokens';

export const prerender = false;

interface CloudflareEnv {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export const GET: APIRoute = async ({ url, request }) => {
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
      const cfEnv = env as unknown as CloudflareEnv;

      if (!cfEnv?.ASSETS) {
        console.error('[cv-download] ASSETS binding is not configured.');
        return Response.json(
          { error: 'CV file is currently unavailable. Please contact directly.' },
          { status: 503 },
        );
      }

      const assetUrl = new URL('/cv.pdf', request.url);
      const assetResponse = await cfEnv.ASSETS.fetch(new Request(assetUrl));

      if (!assetResponse.ok) {
        console.error('[cv-download] CV file not found', assetResponse.status);
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
