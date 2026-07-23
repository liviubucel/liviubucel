// Security and performance headers middleware
import type { AstroCookies } from 'astro';

export interface HeadersConfig {
  cspEnabled?: boolean;
  cacheStrategy?: 'static' | 'dynamic' | 'nocache';
}

/**
 * Content Security Policy header
 * Restricts resources that can be loaded
 */
export function getCSPHeader(): string {
  const policies = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://app.cal.com",
    "style-src 'self' 'unsafe-inline' https://app.cal.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://app.cal.com https://cal.com https://*.sanity.io https://*.ingest.sentry.io",
    "frame-src https://app.cal.com https://cal.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  return policies;
}

/**
 * Cache-Control header based on route
 */
export function getCacheControl(pathname: string): string {
  // Static assets - cache long
  if (/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(pathname)) {
    return 'public, max-age=31536000, immutable'; // 1 year
  }

  // HTML pages - cache short + revalidate
  if (pathname.endsWith('/') || pathname.endsWith('.html')) {
    return 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'; // 1h client, 1d CDN
  }

  // API routes - no cache
  if (pathname.startsWith('/api/') || pathname.startsWith('/.well-known/')) {
    return 'private, no-store';
  }

  // Default
  return 'public, max-age=3600, must-revalidate';
}

/**
 * Generate Security headers
 */
export function getSecurityHeaders() {
  return {
    'Content-Security-Policy': getCSPHeader(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Permissions-Policy': [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
  };
}

/**
 * Generate Performance headers
 */
export function getPerformanceHeaders() {
  return {
    'X-DNS-Prefetch-Control': 'on',
  };
}
