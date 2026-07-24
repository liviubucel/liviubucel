import { SITE } from '../site-config';
import type { Language } from './i18n';

export interface SEOMeta {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  canonical?: string;
  lang?: Language;
  robots?: string;
  keywords?: string;
  author?: string;
}

export function getSEOMeta(config: SEOMeta, baseUrl: string = SITE.site.url) {
  const canonical = config.canonical || baseUrl;
  const ogImage = config.ogImage || `${baseUrl.replace(/\/$/, '')}/og-image.jpg`;

  return {
    title: config.title,
    description: config.description,
    canonical,
    'og:title': config.title,
    'og:description': config.description,
    'og:image': ogImage,
    'og:type': config.ogType || 'website',
    'og:url': canonical,
    'twitter:card': 'summary_large_image',
    'twitter:title': config.title,
    'twitter:description': config.description,
    'twitter:image': ogImage,
    'twitter:creator': `@${SITE.author.twitterHandle}`,
    'robots': config.robots || 'index, follow',
    ...(config.keywords && { 'keywords': config.keywords }),
    ...(config.author && { 'author': config.author }),
  };
}

export function getPersonSchema(lang: Language = 'en') {
  const baseUrl = SITE.site.url;

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.author.fullName,
    alternateName: SITE.author.shortName,
    image: `${baseUrl}avatar.webp`,
    jobTitle: SITE.author.jobTitle,
    url: baseUrl,
    sameAs: [
      SITE.links.github,
      SITE.links.linkedin,
      ...(SITE.author.twitterHandle ? [`https://twitter.com/${SITE.author.twitterHandle}`] : []),
    ].filter(Boolean),
    location: {
      '@type': 'Place',
      name: SITE.location.countryName,
    },
    email: SITE.links.email,
  };
}

export function getArticleSchema(config: {
  title: string;
  description: string;
  publishedAt: Date;
  updatedAt?: Date;
  image?: string;
  author?: string;
  url: string;
}) {
  const baseUrl = SITE.site.url;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: config.title,
    description: config.description,
    image: config.image || `${baseUrl}og-image.jpg`,
    datePublished: config.publishedAt.toISOString(),
    dateModified: config.updatedAt?.toISOString() || config.publishedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: config.author || SITE.author.fullName,
      url: baseUrl,
    },
    url: config.url,
  };
}

export function generateAlternateLinks(pathname: string, baseUrl: string = SITE.site.url) {
  const cleanPath = pathname.replace(/^\/(en|ro)/, '');

  return [
    { hreflang: 'en', href: `${baseUrl}${cleanPath}` },
    { hreflang: 'ro', href: `${baseUrl}ro${cleanPath}` },
    { hreflang: 'x-default', href: `${baseUrl}${cleanPath}` },
  ];
}
