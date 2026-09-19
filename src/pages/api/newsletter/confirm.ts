// Legacy confirmation endpoint retained only so old links fail clearly after
// the newsletter migration to native Wix Forms double opt-in.
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () =>
  new Response(
    'This legacy confirmation link is no longer used. Please subscribe again from liviubucel.com so Wix can issue a current confirmation link.',
    {
      status: 410,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
