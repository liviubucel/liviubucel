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
  // Static files should never be language-routed.
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
    // Ignore and remove the old auto-detection cookie used by the previous
    // implementation so a past UK/RO visit cannot pin the wrong language.
    headers.append('Set-Cookie', clearLegacyLanguageCookie());
  }

  return new Response(null, { status: 302, headers });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;

  // Enforce a single canonical host/scheme in the app itself, not just at
  // Cloudflare's edge. Local development is intentionally left alone.
  if (!LOCAL_HOSTS.has(url.hostname) && (url.hostname !== CANONICAL_HOST || url.protocol !== 'https:')) {
    const canonicalUrl = new URL(url);
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = CANONICAL_HOST;
    canonicalUrl.port = '';
    return Response.redirect(canonicalUrl.toString(), 301);
  }

  if (isLocalisedPageRequest(context.request, url.pathname)) {
    const explicitLanguage = url.searchParams.get('lang');
    if (explicitLanguage === 'en' || explicitLanguage === 'ro') {
      // The language switcher is an explicit user choice and is the only
      // path that persists a language preference.
      return languageRedirect(url, explicitLanguage, true);
    }

    // An explicit /ro URL is itself an explicit language request. Always
    // honour it regardless of the visitor's country or a previous preference.
    // This keeps shared/bookmarked Romanian URLs stable and avoids geo loops.
    if (!hasRomanianPrefix(url.pathname)) {
      const manualLanguage = getManualLanguage(context.request);
      const preferredLanguage = manualLanguage ?? automaticLanguage(context.request);

      // Only unprefixed URLs need automatic routing. English is canonical at
      // the root, while RO/MD visitors without a manual preference are sent
      // to the matching /ro route. The automatic country result is NOT saved,
      // so travelling from the UK to Romania (or vice versa) is re-evaluated.
      if (preferredLanguage === 'ro') {
        return languageRedirect(url, 'ro');
      }
    }
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
