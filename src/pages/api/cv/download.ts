import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

interface TokenRecord {
  token: string;
  expiresAt: number;
  email: string;
}

const validTokens: Map<string, TokenRecord> = new Map();

function isTokenValid(token: string): boolean {
  const record = validTokens.get(token);
  if (!record) {
    return false;
  }

  if (Date.now() > record.expiresAt) {
    validTokens.delete(token);
    return false;
  }

  return true;
}

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
      const cvPath = join(process.cwd(), 'public', 'cv.pdf');
      const fileBuffer = await readFile(cvPath);

      validTokens.delete(token);

      return new Response(fileBuffer, {
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

export function registerToken(token: string, expiresAt: number, email: string): void {
  validTokens.set(token, { token, expiresAt, email });
}
