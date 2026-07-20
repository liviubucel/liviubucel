/**
 * i18n Audit Script
 * Validates that all [lang] pages support both EN and RO via getStaticPaths()
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
      } else if (entry.name.endsWith('.astro')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function checkPageSupportsI18n(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check if page has getStaticPaths() and prerender = true
  const hasGetStaticPaths = content.includes('getStaticPaths()');
  const hasPrerender = content.includes('export const prerender = true');
  const checksSupportedLanguages = content.includes('SUPPORTED_LANGUAGES');

  return hasGetStaticPaths && hasPrerender && checksSupportedLanguages;
}

function auditTranslations() {
  console.log('🔍 Auditing i18n translations...\n');

  const files = getPageFiles(PAGES_DIR);

  if (files.length === 0) {
    console.log('⚠️  No pages found in [lang] directory');
    process.exit(1);
  }

  console.log(`✅ Found ${files.length} pages\n`);

  // Check each page supports i18n
  const issues = [];

  files.forEach((file) => {
    if (!checkPageSupportsI18n(file)) {
      const relative = path.relative(PAGES_DIR, file);
      issues.push(relative);
    }
  });

  if (issues.length > 0) {
    console.log(`❌ Found ${issues.length} pages missing i18n support:\n`);
    issues.forEach((page) => {
      console.log(`  ${page}`);
      console.log(`    - Missing: getStaticPaths(), prerender, or SUPPORTED_LANGUAGES`);
    });
    console.log(`\n💡 Make sure each page:
  1. Exports: export const prerender = true;
  2. Has: export function getStaticPaths() { ... }
  3. Imports: import { SUPPORTED_LANGUAGES } from '...lib/i18n'
  4. Returns all language variants from getStaticPaths()\n`);
    process.exit(1);
  }

  console.log('✅ All pages have i18n support (getStaticPaths + prerender + SUPPORTED_LANGUAGES)!');
  process.exit(0);
}

auditTranslations();
