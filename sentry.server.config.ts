import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: "https://08742af3b3edcdb1a152a1a5c4ac17f9@o4511598677852160.ingest.de.sentry.io/4511769744834640",
  enableLogs: true,
  tracesSampleRate: 1.0,
});
