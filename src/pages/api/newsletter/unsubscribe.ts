// Legacy unsubscribe endpoint retained only so old D1 links do not silently
// report success after the newsletter migration to native Wix marketing consent.
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () =>
  new Response(
    'This legacy unsubscribe link is no longer active. Current Wix emails include their own unsubscribe control. If needed, contact me directly to remove an older subscription.',
    {
      status: 410,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
