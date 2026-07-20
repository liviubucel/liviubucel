/**
 * i18n Audit Script
 * Validates that all pages have translations for RO and EN
 */

import fs from 'fs';
import path from 'path';

const PAGES_DIR = './src/pages/[lang]';
const LANGUAGES = ['en', 'ro'];

function getPageFiles(dir) {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.astro') || entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function auditTranslations() {
  console.log('🔍 Auditing i18n translations...\n');

  const files = getPageFiles(PAGES_DIR);

  if (files.length === 0) {
    console.log('⚠️  No pages found in [lang] directory');
    process.exit(1);
  }

  // Extract page routes
  const pages = new Set();
  files.forEach((file) => {
    const relative = path.relative(PAGES_DIR, file);
    const pagePath = relative
      .replace(/\[(lang)\]/g, ':lang')
      .replace(/\/index\.(astro|ts)$/, '')
      .replace(/\.(astro|ts)$/, '');

    pages.add(pagePath);
  });

  console.log(`✅ Found ${pages.size} pages\n`);

  // Check for missing translations
  let issues = 0;
  const missingTranslations = {};

  pages.forEach((page) => {
    LANGUAGES.forEach((lang) => {
      const pattern = new RegExp(`:lang/${page}.*\\.astro$`.replace(':lang', lang));
      const hasTranslation = Array.from(files).some((f) => {
        const relative = path.relative(PAGES_DIR, f);
        return relative.includes(lang) && relative.includes(page);
      });

      if (!hasTranslation && page !== '') {
        if (!missingTranslations[page]) missingTranslations[page] = [];
        missingTranslations[page].push(lang);
        issues++;
      }
    });
  });

  if (issues > 0) {
    console.log(`❌ Found ${issues} missing translations:\n`);
    Object.entries(missingTranslations).forEach(([page, langs]) => {
      console.log(`  ${page}: missing [${langs.join(', ')}]`);
    });
    process.exit(1);
  }

  console.log('✅ All pages have translations for EN and RO!');
  process.exit(0);
}

auditTranslations();
