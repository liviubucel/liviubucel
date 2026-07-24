import { createClient } from "@sanity/client";

const projectId = process.env.SANITY_PROJECT_ID || "8atrdwjk";
const dataset = process.env.SANITY_DATASET || "production";

if (!projectId) {
  console.error("SANITY_PROJECT_ID is not set");
}

export const sanityClient = createClient({
  projectId,
  dataset,
  useCdn: false, // Bypass Sanity CDN cache for fresh portfolio content
  apiVersion: "2025-02-20",
});
