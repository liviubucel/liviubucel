// i18n configuration and helpers
export const LANGUAGES = {
  en: 'English',
  ro: 'Română',
} as const;

export type Language = keyof typeof LANGUAGES;
export const DEFAULT_LANGUAGE: Language = 'en';
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as Language[];

export const TRANSLATIONS = {
  en: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.projects': 'Projects',
    'nav.design': 'Design Works',
    'nav.guestbook': 'Guestbook',
    'nav.contact': 'Contact',
    'footer.copyright': '© 2024 Liviu Bucel',
  },
  ro: {
    'nav.home': 'Acasă',
    'nav.blog': 'Blog',
    'nav.projects': 'Proiecte',
    'nav.design': 'Lucrări de Design',
    'nav.guestbook': 'Guestbook',
    'nav.contact': 'Contact',
    'footer.copyright': '© 2024 Liviu Bucel',
  },
} as const;

export function getLangFromUrl(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  if (lang in LANGUAGES) return lang as Language;
  return DEFAULT_LANGUAGE;
}

export function getPathWithoutLang(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] in LANGUAGES) {
    return '/' + segments.slice(1).join('/');
  }
  return pathname;
}

export function getLocalizedPath(lang: Language, path: string): string {
  const cleanPath = getPathWithoutLang(path);
  if (lang === DEFAULT_LANGUAGE) return cleanPath;
  return `/${lang}${cleanPath}`;
}

export function getTranslation(lang: Language, key: string): string {
  return TRANSLATIONS[lang][key as keyof typeof TRANSLATIONS[Language]] || key;
}

export function getAlternateLinks(pathname: string) {
  const cleanPath = getPathWithoutLang(pathname);
  return SUPPORTED_LANGUAGES.map(lang => ({
    lang,
    href: getLocalizedPath(lang, cleanPath),
  }));
}
