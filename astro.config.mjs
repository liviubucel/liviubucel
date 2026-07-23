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

const envSiteUrl = process.env.SITE_URL || "https://liviubucel.com/";
const site = envSiteUrl.endsWith("/") ? envSiteUrl : `${envSiteUrl}/`;
const siteNoTrailingSlash = site.endsWith("/") ? site.slice(0, -1) : site;
const isLighthouse = process.env.LIGHTHOUSE_CI === "true";

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
      project: "liviubucelcom",
      org: "zebrabyte",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en-GB",
          ro: "ro-RO",
        },
      },
      filter: (page) =>
        !/\/(playground|travel)\/?$/.test(new URL(page).pathname),
    }),
    robotsTxt({
      sitemap: [`${siteNoTrailingSlash}/sitemap-index.xml`],
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
    ...(process.env.SANITY_PROJECT_ID ? [
      sanity({
        projectId: process.env.SANITY_PROJECT_ID,
        dataset: process.env.SANITY_DATASET || "production",
        useCdn: true,
        apiVersion: "2025-02-20",
        // Crisis 404 fallback: client redirects to /en if projectId is missing
        studioUrl: "/studio",
      }),
    ] : []),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime],
  },
  output: "server",
  adapter: isLighthouse ? undefined : cloudflare(),
  vite: {
    assetsInclude: "**/*.riv",
  },
});
