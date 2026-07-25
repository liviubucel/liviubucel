export const schemaTypes = [
  // Author type
  {
    name: 'author',
    title: 'Author',
    type: 'document',
    fields: [
      { name: 'name', title: 'Name', type: 'string', validation: (Rule: any) => Rule.required() },
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
      { name: 'title', title: 'Title', type: 'string', validation: (Rule: any) => Rule.required() },
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
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: { source: 'title' },
        validation: (Rule: any) => Rule.required(),
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
        validation: (Rule: any) => Rule.required(),
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
        validation: (Rule: any) => Rule.required().max(160),
      },
      {
        name: 'metaDescription',
        title: 'Meta Description (SEO)',
        type: 'text',
        validation: (Rule: any) => Rule.max(160),
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
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: { source: 'title' },
        validation: (Rule: any) => Rule.required(),
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
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'metaDescription',
        title: 'Meta Description (SEO)',
        type: 'text',
        validation: (Rule: any) => Rule.max(160),
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
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'email',
        title: 'Email',
        type: 'string',
        validation: (Rule: any) => Rule.required().email(),
      },
      {
        name: 'message',
        title: 'Message',
        type: 'text',
        validation: (Rule: any) => Rule.required().min(5).max(500),
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

  // Certification type
  {
    name: 'certification',
    title: 'Certification',
    type: 'document',
    fields: [
      {
        name: 'name',
        title: 'Certification Name',
        type: 'string',
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'issuer',
        title: 'Issuer',
        type: 'string',
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'status',
        title: 'Status',
        type: 'string',
        options: {
          list: [
            { title: 'Earned', value: 'earned' },
            { title: 'In Progress', value: 'in-progress' },
            { title: 'Planned', value: 'planned' },
          ],
        },
        initialValue: 'planned',
      },
      {
        name: 'iconType',
        title: 'Icon',
        type: 'string',
        description: 'Visual icon for this certification',
        options: {
          list: [
            { title: 'OWASP', value: 'owasp' },
            { title: 'CompTIA', value: 'comptia' },
            { title: 'Cisco', value: 'cisco' },
            { title: '(ISC)²', value: 'isc2' },
            { title: 'Fortinet', value: 'fortinet' },
            { title: 'Palo Alto Networks', value: 'paloaltonetworks' },
            { title: 'Microsoft', value: 'microsoft' },
            { title: 'Google Cloud', value: 'googlecloud' },
            { title: 'IBM', value: 'ibm' },
            { title: 'Red Hat', value: 'redhat' },
            { title: 'VMware', value: 'vmware' },
            { title: 'Juniper Networks', value: 'junipernetworks' },
            { title: 'Splunk', value: 'splunk' },
            { title: 'SonicWall', value: 'sonicwall' },
            { title: 'Kali Linux', value: 'kalilinux' },
            { title: 'Linux Professional Institute', value: 'linuxprofessionalinstitute' },
            { title: 'Hack The Box', value: 'hackthebox' },
            { title: 'TryHackMe', value: 'tryhackme' },
            { title: 'HackerOne', value: 'hackerone' },
            { title: 'Shield (generic)', value: 'shield' },
            { title: 'Network / Router (generic)', value: 'network' },
            { title: 'Bug (generic)', value: 'bug' },
            { title: 'Terminal (generic)', value: 'terminal' },
            { title: 'Lock (generic)', value: 'lock' },
            { title: 'Award (generic)', value: 'award' },
          ],
        },
        initialValue: 'award',
      },
      {
        name: 'order',
        title: 'Display Order',
        type: 'number',
        description: 'Lower number = shown first',
      },
      {
        name: 'credentialUrl',
        title: 'Credential URL',
        type: 'url',
        description: 'Direct link to the credential/verification page (e.g. Credly). Leave empty if not earned yet.',
      },
    ],
  },

  // Profile Settings (singleton)
  {
    name: 'profileSettings',
    title: 'Profile Settings',
    type: 'document',
    fields: [
      {
        name: 'isCurrentlyEmployed',
        title: 'Currently Employed',
        type: 'boolean',
        description: 'Green pulse = open to work. Red blinking = employed.',
        initialValue: false,
      },
      {
        name: 'cvFile',
        title: 'CV File',
        type: 'file',
        description: 'Upload the CV PDF directly.',
        options: {
          accept: '.pdf',
        },
      },
      {
        name: 'phone',
        title: 'Phone Number',
        type: 'string',
        description: 'Shown next to the contact email. Leave empty to hide.',
      },
      {
        name: 'github',
        title: 'GitHub URL',
        type: 'url',
      },
      {
        name: 'linkedin',
        title: 'LinkedIn URL',
        type: 'url',
      },
      {
        name: 'twitter',
        title: 'X (Twitter) URL',
        type: 'url',
        description: 'Leave empty to hide the icon.',
      },
      {
        name: 'youtube',
        title: 'YouTube URL',
        type: 'url',
        description: 'Leave empty to hide the icon.',
      },
      {
        name: 'tryhackme',
        title: 'TryHackMe URL',
        type: 'url',
        description: 'Leave empty to hide the icon.',
      },
      {
        name: 'openToWorkMessage',
        title: 'Status Message',
        type: 'string',
        description: 'Short message shown in the Now card (e.g. "Open to opportunities")',
        initialValue: 'Open to opportunities',
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

  // Page SEO (one document per page, per language)
  {
    name: 'pageSeo',
    title: 'Page SEO',
    type: 'document',
    fields: [
      {
        name: 'pageId',
        title: 'Page',
        type: 'string',
        description: 'Which page this SEO content applies to.',
        options: {
          list: [
            { title: 'Home (EN)', value: 'home' },
            { title: 'Home (RO)', value: 'home-ro' },
            { title: 'Experience (EN)', value: 'experience' },
            { title: 'Experience (RO)', value: 'experience-ro' },
            { title: 'Contact (EN)', value: 'contact' },
            { title: 'Contact (RO)', value: 'contact-ro' },
            { title: 'Blog (EN)', value: 'blog' },
            { title: 'Blog (RO)', value: 'blog-ro' },
            { title: 'Projects (EN)', value: 'projects' },
            { title: 'Projects (RO)', value: 'projects-ro' },
            { title: 'Design Works (EN)', value: 'design-works' },
            { title: 'Design Works (RO)', value: 'design-works-ro' },
            { title: 'Travel (EN)', value: 'travel' },
            { title: 'Travel (RO)', value: 'travel-ro' },
            { title: 'Playground (EN)', value: 'playground' },
            { title: 'Playground (RO)', value: 'playground-ro' },
          ],
        },
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'title',
        title: 'SEO Title',
        type: 'string',
        description: 'Shown in browser tab and search results. Recommended: under 60 characters.',
        validation: (Rule: any) => Rule.max(70),
      },
      {
        name: 'description',
        title: 'SEO Description',
        type: 'text',
        description: 'Shown in search results under the title. Recommended: under 160 characters.',
        validation: (Rule: any) => Rule.max(200),
      },
      {
        name: 'keywords',
        title: 'Keywords',
        type: 'array',
        of: [{ type: 'string' }],
        options: { layout: 'tags' },
        description: 'Focus keywords for this page.',
      },
      {
        name: 'ogImage',
        title: 'Social Share Image (Open Graph)',
        type: 'image',
        description: 'Overrides the default image shown when this page is shared on social media.',
      },
    ],
    preview: {
      select: { title: 'title', subtitle: 'pageId' },
    },
  },
];
