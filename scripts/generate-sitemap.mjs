/**
 * Dynamic Sitemap Generator
 * Creates a sitemap for all routes including i18n variants
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.SITE_URL || 'https://liviubucel.com/';
const PAGES_DIR = './src/pages';
const LANGUAGES = ['en', 'ro'];

const STATIC_PAGES = [
  { loc: '', changefreq: 'weekly', priority: '1.0' },
  { loc: 'blog', changefreq: 'daily', priority: '0.8' },
  { loc: 'projects', changefreq: 'monthly', priority: '0.8' },
  { loc: 'design-works', changefreq: 'monthly', priority: '0.6' },
];

function generateSitemap() {
  console.log('📍 Generating sitemap...\n');

  const urls = [];

  // Add language-specific routes
  LANGUAGES.forEach((lang) => {
    STATIC_PAGES.forEach(({ loc, changefreq, priority }) => {
      let url = BASE_URL;

      // Add language prefix if not English
      if (lang !== 'en') {
        url += `${lang}/`;
      }

      // Add path
      if (loc) {
        url += `${loc}/`;
      }

      urls.push({
        loc: url,
        changefreq,
        priority,
        lastmod: new Date().toISOString().split('T')[0],
      });
    });
  });

  // Generate XML
  const xml = generateSitemapXml(urls);

  // Write file
  const outputPath = './public/sitemap.xml';
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, xml);

  console.log(`✅ Generated sitemap with ${urls.length} URLs`);
  console.log(`📄 Written to: ${outputPath}\n`);
}

function generateSitemapXml(urls) {
  const urlEntries = urls
    .map(
      ({ loc, changefreq, priority, lastmod }) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

generateSitemap();
