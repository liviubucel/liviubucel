# Liviu Bucel — Personal Cybersecurity Portfolio

Personal portfolio focused on ethical hacking, digital investigation, incident response, security testing, and practical security work.

Production site: [liviubucel.com](https://liviubucel.com/)

## Purpose

The site is designed for cybersecurity recruiters, hiring managers, and potential technical collaborators. English is the default language, with Romanian content under `/ro/`.

## Relevant profile

- Technical support and hosting infrastructure experience at ZebraByte
- IT support experience at Intact Media Group
- Practical cybersecurity labs and job simulations
- Focused on DFIR, security operations, security testing, and vulnerability research
- Focused on practical cybersecurity work and selected technical collaborations

## Stack

- Astro and TypeScript
- UnoCSS
- Motion
- Sanity CMS
- Cloudflare Workers

## Main areas

- Professional profile and relevant experience
- Cybersecurity projects
- Technical writing
- Contact and collaboration enquiries
- English and Romanian routes
- SEO and structured data
- Security headers and privacy-conscious API caching

## Local development

```bash
npm install
npm run dev
```

Create a local environment file from the project example and provide only the variables required for the feature you are testing. Never commit Sanity tokens or other credentials.

## Content integrity

Public profile data is configured in `src/site-config.ts`. Dynamic projects, articles, profile settings, and verified certifications can be managed through Sanity.

Only earned certifications with a credential URL should be published. Claims about qualifications, results, or professional experience must remain verifiable.

## Deployment

The project targets Cloudflare Workers. Production configuration and secrets are managed outside the repository.

## Design credit

The bento-grid visual foundation is based on [Ladvace/astro-bento-portfolio](https://github.com/Ladvace/astro-bento-portfolio). The implementation has been adapted for Liviu Bucel's bilingual cybersecurity portfolio.
