// Security and performance headers middleware

export interface HeadersConfig {
  cspEnabled?: boolean;
  cacheStrategy?: 'static' | 'dynamic' | 'nocache';
}

/**
 * Content Security Policy header
 * Restricts resources that can be loaded
 * The embedded Sanity Studio (/studio) needs a relaxed policy to function
 * (unsafe-eval for its editor tooling, sanity.io for auth/API/CDN, popups for login).
 */
export function getCSPHeader(pathname = ''): string {
  const isStudio = pathname.startsWith('/studio');

  const policies = [
    "default-src 'self'",
    isStudio
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    isStudio ? "img-src 'self' data: https: blob:" : "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    isStudio
      ? "connect-src 'self' https://*.sanity.io https://*.apicdn.sanity.io wss://*.sanity.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io"
      : "connect-src 'self' https://*.sanity.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
    isStudio ? "frame-src https://*.sanity.io" : "frame-src 'none'",
    "object-src 'none'",
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    isStudio ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
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
export function getSecurityHeaders(pathname = '') {
  return {
    'Content-Security-Policy': getCSPHeader(pathname),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-Permitted-Cross-Domain-Policies': 'none',
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
