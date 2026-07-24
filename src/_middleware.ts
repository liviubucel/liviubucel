import type { APIContext } from 'astro';
import { getSecurityHeaders, getPerformanceHeaders, getCacheControl } from './middleware/headers';

/**
 * Cloudflare Workers middleware for security & performance headers
 */
export async function onRequest(context: APIContext, next: () => Promise<Response>) {
  const request = context.request;
  const url = new URL(request.url);

  // Get the response
  const response = await next();

  // Clone response to modify headers
  const newResponse = new Response(response.body, response);

  // Add security headers
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  // Add performance headers
  const perfHeaders = getPerformanceHeaders();
  Object.entries(perfHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  // Add cache control header
  const cacheControl = getCacheControl(url.pathname);
  newResponse.headers.set('Cache-Control', cacheControl);

  // Add security headers for Cloudflare
  newResponse.headers.set('X-Robots-Tag', 'index, follow');

  // Remove server info
  newResponse.headers.delete('Server');

  return newResponse;
}
