import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

export default defineConfig({
  name: "default",
  title: "Liviu Bucel Studio",
  projectId: "8atrdwjk",
  dataset: "production",
  plugins: [structureTool()],
  schema: {
    types: [
      {
        name: "post",
        title: "Blog Post",
        type: "document",
        fields: [
          { name: "title", title: "Title", type: "string" },
          { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
          { name: "pubDate", title: "Publish Date", type: "datetime" },
          { name: "description", title: "Description", type: "text" },
          { name: "body", title: "Body", type: "array", of: [{ type: "block" }] },
        ],
      },
      {
        name: "project",
        title: "Project",
        type: "document",
        fields: [
          { name: "title", title: "Title", type: "string" },
          { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
          { name: "pubDate", title: "Publish Date", type: "datetime" },
          { name: "description", title: "Description", type: "text" },
          { name: "body", title: "Body", type: "array", of: [{ type: "block" }] },
        ],
      },
    ],
  },
});
