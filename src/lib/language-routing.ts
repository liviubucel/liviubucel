export type SiteLanguage = 'en' | 'ro';

export const MANUAL_LANGUAGE_COOKIE = 'lb_lang_pref';
export const LEGACY_LANGUAGE_COOKIE = 'lb_lang';
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const ROMANIAN_COUNTRIES = new Set(['RO', 'MD']);

interface CloudflareRequest extends Request {
  cf?: {
    country?: string;
  };
}

export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

export function getManualLanguage(request: Request): SiteLanguage | null {
  const saved = getCookieValue(request.headers.get('cookie'), MANUAL_LANGUAGE_COOKIE);
  return saved === 'en' || saved === 'ro' ? saved : null;
}

export function countryFromRequest(request: Request): string | null {
  const cfCountry = (request as CloudflareRequest).cf?.country;
  const headerCountry = request.headers.get('cf-ipcountry');
  const rawCountry = cfCountry ?? headerCountry;
  if (!rawCountry) return null;

  const country = rawCountry.trim().toUpperCase();
  if (country === 'XX' || country === 'T1') return null;
  return /^[A-Z]{2}$/.test(country) ? country : null;
}

export function automaticLanguage(request: Request): SiteLanguage {
  const country = countryFromRequest(request);
  return country && ROMANIAN_COUNTRIES.has(country) ? 'ro' : 'en';
}

export function hasRomanianPrefix(pathname: string): boolean {
  return pathname === '/ro' || pathname.startsWith('/ro/');
}

export function withoutRomanianPrefix(pathname: string): string {
  if (pathname === '/ro') return '/';
  return pathname.replace(/^\/ro(?=\/)/, '') || '/';
}

export function withLanguage(pathname: string, language: SiteLanguage): string {
  const cleanPath = withoutRomanianPrefix(pathname);
  if (language === 'en') return cleanPath;
  return cleanPath === '/' ? '/ro' : `/ro${cleanPath}`;
}

export function languageCookie(language: SiteLanguage): string {
  return `${MANUAL_LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
}

export function clearLegacyLanguageCookie(): string {
  return `${LEGACY_LANGUAGE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
