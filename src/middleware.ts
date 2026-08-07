import { defineMiddleware } from 'astro:middleware';
import { getCacheControl, getSecurityHeaders } from './middleware/headers';

const CANONICAL_HOST = 'www.liviubucel.com';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const LANGUAGE_COOKIE = 'lb_lang';
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const NON_LOCALISED_PREFIXES = ['/api/', '/studio', '/_astro/', '/favicon', '/robots.txt', '/sitemap'];
const BOT_UA = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|duckduckbot|baiduspider|yandex/i;

interface CloudflareRequest extends Request {
  cf?: {
    country?: string;
  };
}

function isLocalisedPageRequest(request: Request, pathname: string): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (!request.headers.get('accept')?.includes('text/html')) return false;
  if (BOT_UA.test(request.headers.get('user-agent') ?? '')) return false;
  if (NON_LOCALISED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  // Static files should never be language-routed.
  if (/\.[a-z0-9]{2,8}$/i.test(pathname)) return false;
  return true;
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

function languageFromCountry(request: Request): 'ro' | 'en' {
  // Cloudflare supplies only a coarse ISO country code with the request.
  // It is used transiently to choose the first-visit language and is not
  // written to D1/Sanity or otherwise persisted by this application.
  const country = (request as CloudflareRequest).cf?.country?.toUpperCase();
  return country === 'RO' || country === 'MD' ? 'ro' : 'en';
}

function withLanguage(pathname: string, language: 'en' | 'ro'): string {
  // Remove only an actual /ro route segment, never the "ro" at the start of
  // words such as /romania-cyber-monitor.
  const cleanPath = pathname === '/ro' ? '/' : pathname.replace(/^\/ro(?=\/)/, '');
  if (language === 'en') return cleanPath || '/';
  return cleanPath === '/' ? '/ro' : `/ro${cleanPath}`;
}

function languageCookie(language: 'en' | 'ro'): string {
  return `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
}

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

  let languageToPersist: 'en' | 'ro' | null = null;

  if (isLocalisedPageRequest(context.request, url.pathname)) {
    const explicitLanguage = url.searchParams.get('lang');
    if (explicitLanguage === 'en' || explicitLanguage === 'ro') {
      // A manual choice always wins over geolocation. Store it, then remove
      // the control query parameter so canonical/shared URLs remain clean.
      const target = new URL(url);
      target.searchParams.delete('lang');
      target.pathname = withLanguage(url.pathname, explicitLanguage);
      return new Response(null, {
        status: 302,
        headers: {
          Location: target.toString(),
          'Set-Cookie': languageCookie(explicitLanguage),
          'Cache-Control': 'private, no-store',
        },
      });
    }

    const saved = getCookieValue(context.request.headers.get('cookie'), LANGUAGE_COOKIE);
    // Country is the automatic source of truth. Browser UI language is
    // intentionally ignored: RO/MD visitors default to Romanian and all
    // other countries default to English. A saved manual choice still wins.
    const preferredLanguage = saved === 'en' || saved === 'ro' ? saved : languageFromCountry(context.request);

    const currentLanguage: 'en' | 'ro' = url.pathname === '/ro' || url.pathname.startsWith('/ro/') ? 'ro' : 'en';

    if (!saved) languageToPersist = preferredLanguage;

    if (preferredLanguage !== currentLanguage) {
      const target = new URL(url);
      target.pathname = withLanguage(url.pathname, preferredLanguage);
      return new Response(null, {
        status: 302,
        headers: {
          Location: target.toString(),
          'Set-Cookie': languageCookie(preferredLanguage),
          'Cache-Control': 'private, no-store',
        },
      });
    }
  }

  const response = await next();
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(getSecurityHeaders(context.url.pathname))) {
    headers.set(name, value);
  }

  headers.set('Cache-Control', languageToPersist ? 'private, no-store' : getCacheControl(context.url.pathname));
  if (languageToPersist) {
    headers.append('Set-Cookie', languageCookie(languageToPersist));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
