import { defineMiddleware } from 'astro:middleware';
import { getCacheControl, getSecurityHeaders } from './middleware/headers';

export const onRequest = defineMiddleware(async (context, next) => {
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
