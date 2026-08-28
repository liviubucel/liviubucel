import sanity from "@sanity/astro";
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import robotsTxt from "astro-robots-txt";
import UnoCSS from "@unocss/astro";
import icon from "astro-icon";
import solidJs from "@astrojs/solid-js";
import { remarkReadingTime } from "./src/lib/remark-reading-time.mjs";
import svelte from "@astrojs/svelte";
import sentry from "@sentry/astro";
import react from "@astrojs/react";

const envSiteUrl = process.env.SITE_URL || "https://www.liviubucel.com/";
const site = envSiteUrl.endsWith("/") ? envSiteUrl : `${envSiteUrl}/`;
const siteNoTrailingSlash = site.endsWith("/") ? site.slice(0, -1) : site;
const sentryEnabled = Boolean(process.env.PUBLIC_SENTRY_DSN);

// https://astro.build/config
export default defineConfig({
  fonts: [
    {
      provider: fontProviders.local(),
      name: "CabinetGrotesk",
      cssVariable: "--font-cabinet-grotesk",
      options: {
        variants: [
          {
            weight: "100 1000",
            style: "normal",
            src: ["./src/assets/fonts/CabinetGrotesk-Variable.ttf"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Satoshi",
      cssVariable: "--font-satoshi",
      options: {
        variants: [
          {
            weight: "100 1000",
            style: "normal",
            src: ["./src/assets/fonts/Satoshi-Variable.ttf"],
          },
          {
            weight: "100 1000",
            style: "italic",
            src: ["./src/assets/fonts/Satoshi-VariableItalic.ttf"],
          },
        ],
      },
    },
  ],
  site,
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ro"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sentry({
      // Do not inject Sentry's browser/server SDKs unless a runtime DSN is
      // actually configured. Besides avoiding dead observability code, this
      // prevents the known @sentry/astro + Cloudflare workerd Web Vitals crash
      // from turning local/CI (and an unconfigured production build) into HTTP 500s.
      enabled: sentryEnabled,
      project: "liviubucelcom",
      org: "zebrabyte",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en-US",
          ro: "ro-RO",
        },
      },
      filter: (page) =>
        !/\/(playground|travel)\/?$/.test(new URL(page).pathname),
    }),
    robotsTxt({
      sitemap: [
        `${siteNoTrailingSlash}/sitemap-index.xml`,
        `${siteNoTrailingSlash}/sitemap-0.xml`,
      ],
      policy: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/playground", "/travel", "/studio"],
        },
      ],
    }),
    solidJs({ exclude: ["**/node_modules/@sanity/**"] }),
    UnoCSS({ injectReset: true }),
    icon(),
    svelte(),
    react({ include: ["**/node_modules/@sanity/**"] }),
    // db() integration commented out due to CommonJS/ESM incompatibility
    // Use alternative guestbook storage (e.g., external API)
    sanity({
      projectId: process.env.SANITY_PROJECT_ID || "8atrdwjk",
      dataset: process.env.SANITY_DATASET || "production",
      useCdn: true,
      apiVersion: "2025-02-20",
      studioUrl: "/studio",
      studioBasePath: "/studio",
    }),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime],
  },
  output: "server",
  adapter: cloudflare({
    // Keep dev/preview isolated from deployed Cloudflare resources. Production
    // deployment bindings are unaffected; only local/CI binding resolution is local.
    remoteBindings: false,
  }),
  vite: {
    assetsInclude: "**/*.riv",
    ssr: {
      external: ["cross-fetch", "@libsql/hrana-client", "@libsql/client", "promise-limit"],
    },
    optimizeDeps: {
      exclude: ["cross-fetch", "@libsql/hrana-client", "@libsql/client", "promise-limit"],
    },
  },
});
