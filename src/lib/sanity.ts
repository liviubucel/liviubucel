import { createClient } from "@sanity/client";

const projectId = process.env.SANITY_PROJECT_ID || "8atrdwjk";
const dataset = process.env.SANITY_DATASET || "production";
const token = process.env.SANITY_AUTH_TOKEN;

if (!projectId) {
  console.error("SANITY_PROJECT_ID is not set");
}

export const sanityClient = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: "2025-02-20",
  token: token,
  fetch: async (url, options) => {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error("Sanity API fetch error:", {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
