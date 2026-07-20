import { defineMiddleware } from 'astro:middleware';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from './lib/i18n';

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Extract language from URL path
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  // If path starts with a language code, continue
  if (SUPPORTED_LANGUAGES.includes(firstSegment as Language)) {
    return next();
  }

  // If root path, detect language from Accept-Language header
  if (pathname === '/' || pathname === '') {
    const acceptLanguage = context.request.headers.get('accept-language') || '';
    const preferredLang = acceptLanguage
      .split(',')[0]
      .split('-')[0]
      .toLowerCase() as Language;

    const lang = SUPPORTED_LANGUAGES.includes(preferredLang)
      ? preferredLang
      : DEFAULT_LANGUAGE;

    if (lang !== DEFAULT_LANGUAGE) {
      return context.redirect(`/${lang}/`);
    }
    return next();
  }

  // For non-language-prefixed paths, add default language prefix
  if (!SUPPORTED_LANGUAGES.includes(firstSegment as Language)) {
    return context.redirect(`/${DEFAULT_LANGUAGE}${pathname}`);
  }

  return next();
});
