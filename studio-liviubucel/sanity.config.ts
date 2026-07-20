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

      // Guestbook Entry type
      {
        name: 'guestbookEntry',
        title: 'Guestbook Entry',
        type: 'document',
        fields: [
          {
            name: 'name',
            title: 'Name',
            type: 'string',
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'email',
            title: 'Email',
            type: 'string',
            validation: (Rule) => Rule.required().email(),
          },
          {
            name: 'message',
            title: 'Message',
            type: 'text',
            validation: (Rule) => Rule.required().min(5).max(500),
          },
          {
            name: 'website',
            title: 'Website (Optional)',
            type: 'url',
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
            name: 'approved',
            title: 'Approved',
            type: 'boolean',
            initialValue: false,
          },
          {
            name: 'submittedAt',
            title: 'Submitted At',
            type: 'datetime',
            initialValue: () => new Date().toISOString(),
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

      // Homepage Singleton
      {
        name: 'homepage',
        title: 'Homepage',
        type: 'document',
        fields: [
          { name: 'fullName', title: 'Full Name', type: 'string' },
          { name: 'role', title: 'Role/Title', type: 'string' },
          { name: 'tagline', title: 'Tagline', type: 'text' },
          { name: 'location', title: 'Location', type: 'string' },
          { name: 'email', title: 'Email', type: 'string' },
          { name: 'cvUrl', title: 'CV URL', type: 'url' },
          {
            name: 'aboutText',
            title: 'About Text',
            type: 'array',
            of: [{ type: 'block' }],
          },
        ],
      },

      // Tech Stack
      {
        name: 'techStack',
        title: 'Tech Stack',
        type: 'document',
        fields: [
          { name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required() },
          { name: 'icon', title: 'Icon', type: 'string' },
          { name: 'order', title: 'Order', type: 'number' },
        ],
      },

      // Social Links
      {
        name: 'socialLink',
        title: 'Social Link',
        type: 'document',
        fields: [
          { name: 'platform', title: 'Platform', type: 'string', validation: (Rule) => Rule.required() },
          { name: 'url', title: 'URL', type: 'url', validation: (Rule) => Rule.required() },
          { name: 'icon', title: 'Icon', type: 'string' },
          { name: 'order', title: 'Order', type: 'number' },
        ],
      },

      // Cyber Security Stats
      {
        name: 'cyberStats',
        title: 'Cyber Security Stats',
        type: 'document',
        fields: [
          { name: 'title', title: 'Title', type: 'string' },
          {
            name: 'stats',
            title: 'Stats',
            type: 'array',
            of: [
              {
                type: 'object',
                fields: [
                  { name: 'label', title: 'Label', type: 'string' },
                  { name: 'value', title: 'Value', type: 'string' },
                ],
              },
            ],
          },
          {
            name: 'certifications',
            title: 'Certifications',
            type: 'array',
            of: [{ type: 'string' }],
          },
        ],
      },
    ],
  },
});
