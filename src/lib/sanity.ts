import { createClient } from "@sanity/client";

export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || "8atrdwjk",
  dataset: import.meta.env.SANITY_DATASET || "production",
  useCdn: true,
  apiVersion: "2024-03-15",
});
