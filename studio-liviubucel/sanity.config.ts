import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

export default defineConfig({
  name: 'default',
  title: 'Liviu Bucel Studio',
  projectId: '8atrdwjk',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {
    types: [
      // Author type
      {
        name: 'author',
        title: 'Author',
        type: 'document',
        fields: [
          { name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required() },
          { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name' } },
          { name: 'email', title: 'Email', type: 'string' },
          { name: 'bio', title: 'Bio', type: 'text' },
          {
            name: 'image',
            title: 'Image',
            type: 'image',
            options: { hotspot: true },
          },
        ],
      },

      // Category type
      {
        name: 'category',
        title: 'Category',
        type: 'document',
        fields: [
          { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
          { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' } },
          { name: 'description', title: 'Description', type: 'text' },
        ],
      },

      // Blog Post type (upgraded)
      {
        name: 'post',
        title: 'Blog Post',
        type: 'document',
        fields: [
          {
            name: 'title',
            title: 'Title',
            type: 'string',
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: { source: 'title' },
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'language',
            title: 'Language',
            type: 'string',
            options: {
              list: [
                { title: 'English', value: 'en' },
                { title: 'Română', value: 'ro' },
              ],
            },
            initialValue: 'en',
          },
          {
            name: 'pubDate',
            title: 'Publish Date',
            type: 'datetime',
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'updatedAt',
            title: 'Updated At',
            type: 'datetime',
          },
          {
            name: 'description',
            title: 'Description (Excerpt)',
            type: 'text',
            validation: (Rule) => Rule.required().max(160),
          },
          {
            name: 'metaDescription',
            title: 'Meta Description (SEO)',
            type: 'text',
            validation: (Rule) => Rule.max(160),
          },
          {
            name: 'keywords',
            title: 'Keywords',
            type: 'array',
            of: [{ type: 'string' }],
          },
          {
            name: 'featuredImage',
            title: 'Featured Image',
            type: 'image',
            options: { hotspot: true },
          },
          {
            name: 'category',
            title: 'Category',
            type: 'reference',
            to: [{ type: 'category' }],
          },
          {
            name: 'tags',
            title: 'Tags',
            type: 'array',
            of: [{ type: 'string' }],
          },
          {
            name: 'author',
            title: 'Author',
            type: 'reference',
            to: [{ type: 'author' }],
            initialValue: {
              _ref: 'liviu',
            },
          },
          {
            name: 'body',
            title: 'Body',
            type: 'array',
            of: [
              { type: 'block' },
              {
                type: 'image',
                options: { hotspot: true },
              },
              {
                type: 'object',
                name: 'codeBlock',
                title: 'Code Block',
                fields: [
                  { name: 'language', title: 'Language', type: 'string' },
                  { name: 'code', title: 'Code', type: 'text' },
                ],
              },
            ],
          },
          {
            name: 'published',
            title: 'Published',
            type: 'boolean',
            initialValue: true,
          },
        ],
      },

      // Project type (upgraded)
      {
        name: 'project',
        title: 'Project',
        type: 'document',
        fields: [
          {
            name: 'title',
            title: 'Title',
            type: 'string',
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: { source: 'title' },
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'language',
            title: 'Language',
            type: 'string',
            options: {
              list: [
                { title: 'English', value: 'en' },
                { title: 'Română', value: 'ro' },
              ],
            },
            initialValue: 'en',
          },
          {
            name: 'description',
            title: 'Description (Excerpt)',
            type: 'text',
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'metaDescription',
            title: 'Meta Description (SEO)',
            type: 'text',
            validation: (Rule) => Rule.max(160),
          },
          {
            name: 'featuredImage',
            title: 'Featured Image',
            type: 'image',
            options: { hotspot: true },
          },
          {
            name: 'tags',
            title: 'Technologies',
            type: 'array',
            of: [{ type: 'string' }],
          },
          {
            name: 'body',
            title: 'Description',
            type: 'array',
            of: [{ type: 'block' }],
          },
          {
            name: 'links',
            title: 'Links',
            type: 'object',
            fields: [
              { name: 'demo', title: 'Demo URL', type: 'url' },
              { name: 'github', title: 'GitHub URL', type: 'url' },
            ],
          },
          {
            name: 'featured',
            title: 'Featured',
            type: 'boolean',
            initialValue: false,
          },
          {
            name: 'pubDate',
            title: 'Created Date',
            type: 'datetime',
          },
        ],
      },

      // Global Settings
      {
        name: 'settings',
        title: 'Site Settings',
        type: 'document',
        fields: [
          { name: 'title', title: 'Site Title', type: 'string' },
          { name: 'description', title: 'Site Description', type: 'text' },
          {
            name: 'ogImage',
            title: 'OG Image (Social Media)',
            type: 'image',
          },
          {
            name: 'author',
            title: 'Default Author',
            type: 'reference',
            to: [{ type: 'author' }],
          },
        ],
      },
    ],
  },
});
