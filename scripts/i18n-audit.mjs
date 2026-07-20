/**
 * i18n Audit Script (Simplified Routing)
 * Validates that English pages at root have corresponding Romanian pages at /ro/
 */

import fs from 'fs';
import path from 'path';

const PAGES_DIR = './src/pages';
const EN_PAGES_DIR = './src/pages';
const RO_PAGES_DIR = './src/pages/ro';

function getPageFiles(dir, excludeDir = 'ro') {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory() && entry.name !== excludeDir && entry.name !== 'ro') {
        walk(fullPath);
      } else if (entry.name.endsWith('.astro')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function auditTranslations() {
  console.log('🔍 Auditing i18n routing structure...\n');

  // Get English pages (root level, excluding ro and special files)
  const enPages = getPageFiles(EN_PAGES_DIR, 'ro').filter(f =>
    !f.includes('/ro') &&
    !f.endsWith('llms.txt.ts') &&
    !f.endsWith('rss.xml.js')
  );

  if (enPages.length === 0) {
    console.log('⚠️  No English pages found');
    process.exit(1);
  }

  console.log(`✅ Found ${enPages.length} English pages`);
  if (process.env.DEBUG) {
    console.log('Debug - English pages:');
    enPages.forEach(p => console.log(`  ${p}`));
  }
  console.log();

  // Check for corresponding Romanian pages
  const issues = [];
  const missingRO = [];

  enPages.forEach((enFile) => {
    // Remove the 'src/pages/' prefix to get the relative path
    let relative = enFile.replace(/^\.?\/?(src\/pages\/)?/, '');
    const roFile = `./src/pages/ro/${relative}`;

    if (!fs.existsSync(roFile)) {
      missingRO.push(`  ❌ Missing: /ro/${relative}`);
      issues.push(roFile);
    }
  });

  if (missingRO.length > 0) {
    console.log(`⚠️  Found ${missingRO.length} pages missing Romanian translations:\n`);
    missingRO.forEach(msg => console.log(msg));
    console.log('\n💡 Create corresponding /ro/ pages for full i18n support\n');
  } else {
    console.log('✅ All pages have Romanian translations!');
  }

  console.log('\n📋 Page structure:');
  console.log('  English: / (root)');
  console.log('  Romanian: /ro/\n');

  console.log('✅ i18n routing validation complete!');
  process.exit(0);
}

auditTranslations();
