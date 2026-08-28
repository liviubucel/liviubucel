import { defineMiddleware } from 'astro:middleware';
import { getCacheControl, getSecurityHeaders } from './middleware/headers';
import {
  automaticLanguage,
  clearLegacyLanguageCookie,
  getManualLanguage,
  hasRomanianPrefix,
  languageCookie,
  withLanguage,
  type SiteLanguage,
} from './lib/language-routing';

const CANONICAL_HOST = 'www.liviubucel.com';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const NON_LOCALISED_PREFIXES = ['/api/', '/studio', '/_astro/', '/favicon', '/robots.txt', '/sitemap'];
const BOT_UA = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|duckduckbot|baiduspider|yandex/i;

function isLocalisedPageRequest(request: Request, pathname: string): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (!request.headers.get('accept')?.includes('text/html')) return false;
  if (BOT_UA.test(request.headers.get('user-agent') ?? '')) return false;
  if (NON_LOCALISED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (/\.[a-z0-9]{2,8}$/i.test(pathname)) return false;
  return true;
}

function languageRedirect(url: URL, language: SiteLanguage, persistManualChoice = false): Response {
  const target = new URL(url);
  target.searchParams.delete('lang');
  target.pathname = withLanguage(url.pathname, language);

  const headers = new Headers({
    Location: target.toString(),
    'Cache-Control': 'private, no-store',
  });

  if (persistManualChoice) {
    headers.append('Set-Cookie', languageCookie(language));
    headers.append('Set-Cookie', clearLegacyLanguageCookie());
  }

  return new Response(null, { status: 302, headers });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;
  const isLocalHost = LOCAL_HOSTS.has(url.hostname);

  if (!isLocalHost && (url.hostname !== CANONICAL_HOST || url.protocol !== 'https:')) {
    const canonicalUrl = new URL(url);
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = CANONICAL_HOST;
    canonicalUrl.port = '';
    return Response.redirect(canonicalUrl.toString(), 301);
  }

  if (isLocalisedPageRequest(context.request, url.pathname)) {
    const explicitLanguage = url.searchParams.get('lang');
    if (explicitLanguage === 'en' || explicitLanguage === 'ro') {
      return languageRedirect(url, explicitLanguage, true);
    }

    // An explicit /ro URL is always honoured. Geo-routing only decides what
    // to do with unprefixed URLs, so shared/bookmarked RO links stay stable.
    if (!hasRomanianPrefix(url.pathname)) {
      const manualLanguage = getManualLanguage(context.request);
      const preferredLanguage = manualLanguage ?? automaticLanguage(context.request);

      // Automatic country choice is deliberately not persisted. If a visitor
      // travels from the UK to Romania (or vice versa), the next visit is
      // evaluated from the current Cloudflare country. Only a manual choice
      // made in the language switcher is stored.
      if (preferredLanguage === 'ro') {
        return languageRedirect(url, 'ro');
      }
    }
  }

  const response = await next();
  const headers = new Headers(response.headers);

  for (const [name, rawValue] of Object.entries(getSecurityHeaders(context.url.pathname))) {
    // HSTS and upgrade-insecure-requests are production HTTPS controls. Sending
    // them from an HTTP localhost preview can force browser tooling onto an HTTPS
    // endpoint that does not exist, and it also makes local/CI behavior diverge
    // from the intended isolated preview environment.
    if (isLocalHost && name === 'Strict-Transport-Security') continue;

    const value =
      isLocalHost && name === 'Content-Security-Policy'
        ? rawValue.replace(/;\s*upgrade-insecure-requests\b/, '')
        : rawValue;

    headers.set(name, value);
  }

  headers.set('Cache-Control', getCacheControl(context.url.pathname));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
