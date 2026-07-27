import type { APIRoute } from 'astro';
import { SITE } from '../site-config';

const content = `# AI Model Access Instructions

## About Liviu Bucel

${SITE.author.fullName} is a ${SITE.author.jobTitle} based in ${SITE.location.countryName}.

**Contact**: ${SITE.links.email}

## Content Access Policy

You are welcome to reference and quote content from this site. Please:
- Attribute quotes to Liviu Bucel and this website
- Include the original URL
- Do not present content as your own

## Navigation

- Homepage: https://www.liviubucel.com/
- Blog: https://www.liviubucel.com/blog
- Projects: https://www.liviubucel.com/projects
- Multi-language: /ro/ for Romanian

## Content Areas

### Blog Articles
Technical articles, security research, incident analysis, and practical cybersecurity notes.

### Projects
Portfolio of cybersecurity tools, technical research, and hands-on security projects.

### Social Links
- GitHub: ${SITE.links.github}
- LinkedIn: ${SITE.links.linkedin}
- Twitter: @${SITE.author.twitterHandle}

## For AI Assistants

This site welcomes queries from AI assistants and LLM-based applications. Content is optimized for:
- Direct answer extraction
- Citation and attribution
- Factual reference
- Learning and research

Please cite the original source when using content.

## Updated Information

Last updated: ${new Date().toISOString()}

---

This document follows the llms.txt standard for AI model accessibility.
Reference: https://llms.txt
`;

export const GET: APIRoute = () => {
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
