import { createClient } from "@sanity/client";

const projectId = process.env.SANITY_PROJECT_ID || "8atrdwjk";
const dataset = process.env.SANITY_DATASET || "production";

if (!projectId) {
  console.error("SANITY_PROJECT_ID is not set");
}

export const sanityClient = createClient({
  projectId,
  dataset,
  useCdn: false, // Set to false to bypass Sanity edge cache issues
  apiVersion: "2025-02-20",
  fetch: (url, init) => {
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        "User-Agent": "cloudflare-workers",
      },
    });
  }
});
