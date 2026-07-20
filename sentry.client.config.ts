import * as Sentry from '@sentry/astro';

// Initialize Sentry for client-side error tracking
// This file is automatically loaded by @sentry/astro integration

export function initSentry() {
  Sentry.init({
    // Replace with your actual Sentry DSN
    // Get it from: https://sentry.io/settings/liviu-bucel/projects/
    dsn: import.meta.env.SENTRY_DSN || '',

    // Performance Monitoring
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,

    // Session Replay
    replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,

    environment: import.meta.env.MODE,

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'unknown',

    // Capture breadcrumbs
    maxBreadcrumbs: 50,

    // Performance settings
    ignoreErrors: [
      // Random plugins/extensions
      'top.GLOBALS',
      // Generic catch-all
      "Can't find variable: ZiteReader",
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // Network errors
      'NetworkError',
      'Network request failed',
    ],
  });
}

if (typeof window !== 'undefined') {
  initSentry();
}
