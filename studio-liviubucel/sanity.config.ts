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
      // ── Blog Posts ──────────────────────────────────────────────────
      {
        name: "post",
        title: "Blog Post",
        type: "document",
        fields: [
          { name: "title", title: "Title", type: "string" },
          { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
          { name: "pubDate", title: "Publish Date", type: "datetime" },
          { name: "description", title: "Description", type: "text" },
          {
            name: "coverImage",
            title: "Cover Image",
            type: "image",
            options: { hotspot: true },
          },
          { name: "body", title: "Body", type: "array", of: [{ type: "block" }, { type: "image" }] },
        ],
      },

      // ── Projects ────────────────────────────────────────────────────
      {
        name: "project",
        title: "Project",
        type: "document",
        fields: [
          { name: "title", title: "Title", type: "string" },
          { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
          { name: "pubDate", title: "Publish Date", type: "datetime" },
          { name: "description", title: "Short Description", type: "text" },
          { name: "url", title: "Project URL", type: "url" },
          { name: "github", title: "GitHub URL", type: "url" },
          {
            name: "thumbnail",
            title: "Thumbnail Image",
            type: "image",
            options: { hotspot: true },
          },
          {
            name: "tags",
            title: "Tags / Technologies",
            type: "array",
            of: [{ type: "string" }],
          },
          { name: "body", title: "Body", type: "array", of: [{ type: "block" }, { type: "image" }] },
        ],
      },

      // ── Homepage / About ────────────────────────────────────────────
      {
        name: "homepage",
        title: "Homepage Content",
        type: "document",
        fields: [
          { name: "fullName", title: "Full Name", type: "string" },
          { name: "role", title: "Role / Title", type: "string" },
          { name: "tagline", title: "Tagline (short intro)", type: "text" },
          { name: "aboutText", title: "About Me (long text)", type: "array", of: [{ type: "block" }] },
          {
            name: "avatar",
            title: "Profile Photo",
            type: "image",
            options: { hotspot: true },
          },
          { name: "location", title: "Location", type: "string" },
          { name: "email", title: "Email", type: "string" },
          { name: "cvUrl", title: "CV / Resume URL", type: "url" },
        ],
      },

      // ── Tech Stack ──────────────────────────────────────────────────
      {
        name: "techStack",
        title: "Tech Stack Item",
        type: "document",
        fields: [
          { name: "name", title: "Technology Name", type: "string" },
          { name: "icon", title: "Icon (devicon class or URL)", type: "string" },
          { name: "order", title: "Display Order", type: "number" },
        ],
      },

      // ── Social Links ────────────────────────────────────────────────
      {
        name: "socialLink",
        title: "Social Link",
        type: "document",
        fields: [
          { name: "platform", title: "Platform", type: "string" },
          { name: "url", title: "URL", type: "url" },
          { name: "icon", title: "Icon Name", type: "string" },
          { name: "order", title: "Display Order", type: "number" },
        ],
      },

      // ── Cyber Security Stats ────────────────────────────────────────
      {
        name: "cyberStats",
        title: "Cyber Security Stats",
        type: "document",
        fields: [
          { name: "title", title: "Card Title", type: "string" },
          {
            name: "stats",
            title: "Stats",
            type: "array",
            of: [
              {
                type: "object",
                fields: [
                  { name: "label", title: "Label", type: "string" },
                  { name: "value", title: "Value", type: "string" },
                ],
              },
            ],
          },
          {
            name: "certifications",
            title: "Certifications",
            type: "array",
            of: [{ type: "string" }],
          },
        ],
      },
    ],
  },
});
