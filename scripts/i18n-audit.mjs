/**
 * i18n Audit Script (Simplified Routing)
 * Validates that English Astro pages have corresponding Romanian pages at /ro/.
 * Missing route pairs are a build failure because geo-language routing assumes
 * that every localised public page can be mapped safely in both directions.
 */

import fs from 'fs';
import path from 'path';

const EN_PAGES_DIR = './src/pages';

function getPageFiles(dir, excludeDir = 'ro') {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory() && entry.name !== excludeDir && entry.name !== 'ro' && entry.name !== 'api') {
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

  const enPages = getPageFiles(EN_PAGES_DIR, 'ro').filter(
    (file) => !file.includes('/ro/') && !file.includes('\\ro\\')
  );

  if (enPages.length === 0) {
    console.error('❌ No English pages found');
    process.exit(1);
  }

  console.log(`✅ Found ${enPages.length} English Astro pages`);

  const missingRO = [];

  for (const enFile of enPages) {
    const normalised = enFile.replaceAll('\\', '/');
    const relative = normalised.replace(/^\.?\/?src\/pages\//, '');
    const roFile = `./src/pages/ro/${relative}`;

    if (!fs.existsSync(roFile)) {
      missingRO.push(`/ro/${relative.replace(/\.astro$/, '')}`);
    }
  }

  if (missingRO.length > 0) {
    console.error(`\n❌ ${missingRO.length} English page(s) have no Romanian route counterpart:`);
    for (const route of missingRO) console.error(`   ${route}`);
    console.error('\nGeo-language routing is unsafe until route parity is restored.');
    process.exit(1);
  }

  console.log('✅ All public Astro pages have Romanian route counterparts.');
  console.log('✅ i18n routing validation complete!');
}

auditTranslations();
