import { defineMiddleware } from 'astro:middleware';
import { getCacheControl, getSecurityHeaders } from './middleware/headers';

const CANONICAL_HOST = 'www.liviubucel.com';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;

  // Enforce a single canonical host/scheme in the app itself, not just at
  // Cloudflare's edge - a DNS/redirect-rule misconfiguration there
  // shouldn't be the only thing standing between visitors and the apex
  // domain or plain HTTP. Left alone in local dev, where the hostname is
  // never the production one.
  if (!LOCAL_HOSTS.has(url.hostname) && (url.hostname !== CANONICAL_HOST || url.protocol !== 'https:')) {
    const canonicalUrl = new URL(url);
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = CANONICAL_HOST;
    canonicalUrl.port = '';
    return Response.redirect(canonicalUrl.toString(), 301);
  }

  const response = await next();
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(getSecurityHeaders(context.url.pathname))) {
    headers.set(name, value);
  }

  headers.set('Cache-Control', getCacheControl(context.url.pathname));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
