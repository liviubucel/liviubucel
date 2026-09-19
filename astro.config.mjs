import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import UnoCSS from "@unocss/astro";
import icon from "astro-icon";
import solidJs from "@astrojs/solid-js";
import { remarkReadingTime } from "./src/lib/remark-reading-time.mjs";
import svelte from "@astrojs/svelte";
import sentry from "@sentry/astro";
import react from "@astrojs/react";
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";
import cloudProviderFetchAdapter from "@wix/cloud-provider-fetch-adapter";

const envSiteUrl = process.env.SITE_URL || "https://www.liviubucel.com/";
const site = envSiteUrl.endsWith("/") ? envSiteUrl : `${envSiteUrl}/`;
const siteNoTrailingSlash = site.endsWith("/") ? site.slice(0, -1) : site;
const sentryEnabled = Boolean(process.env.PUBLIC_SENTRY_DSN);
const isBuild = process.env.NODE_ENV === "production";

// Wix Managed Headless is the production runtime. The project remains Astro,
// but hosting, backend integration and Wix business APIs are managed by Wix.
export default defineConfig({
  site,
  security: { checkOrigin: false },
  experimental: {
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
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ro"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    wix(),
    wixPages(),
    sentry({
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
          disallow: ["/api/", "/playground", "/travel"],
        },
      ],
    }),
    solidJs(),
    UnoCSS({ injectReset: true }),
    icon(),
    svelte(),
    react(),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime],
  },
  output: "server",
  ...(isBuild && { adapter: cloudProviderFetchAdapter({}) }),
  image: {
    domains: ["static.wixstatic.com", "usrfiles.com"],
  },
  vite: {
    assetsInclude: "**/*.riv",
  },
});
