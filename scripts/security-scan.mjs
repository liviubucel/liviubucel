/**
 * Security Scanning Script
 * Checks for common security issues in codebase
 */

import fs from 'fs';
import path from 'path';

const SCAN_DIRS = ['./src', './scripts', './studio-liviubucel'];
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.astro',
  '.sanity',
  'coverage',
]);
const DANGEROUS_PATTERNS = [
  { pattern: /eval\s*\(/g, name: 'eval()', severity: 'critical' },
  { pattern: /new\s+Function\s*\(/g, name: 'Function constructor', severity: 'critical' },
  { pattern: /innerHTML\s*=/g, name: 'innerHTML assignment', severity: 'high' },
  { pattern: /dangerouslySetInnerHTML/g, name: 'dangerouslySetInnerHTML', severity: 'high' },
  { pattern: /document\.write\s*\(/g, name: 'document.write()', severity: 'high' },
  { pattern: /from\s+['"]node:child_process['"]/g, name: 'child_process import', severity: 'high' },
  { pattern: /require\(.*\$.*\)/g, name: 'dynamic require with variable', severity: 'high' },
  {
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|www\.w3\.org\/2000\/svg)/g,
    name: 'unencrypted HTTP URL',
    severity: 'medium',
    ignoreInTests: true,
  },
];

function isTestFile(filePath) {
  return /\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(filePath);
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  const testFile = isTestFile(filePath);

  DANGEROUS_PATTERNS.forEach(({ pattern, name, severity, ignoreInTests = false }) => {
    // Test fixtures intentionally exercise unsafe URLs. Ignore only the HTTP
    // transport rule there; critical/high code-execution patterns are still
    // scanned in tests and remain blocking.
    if (testFile && ignoreInTests) return;

    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        file: filePath,
        pattern: name,
        severity,
        count: matches.length,
      });
    }
  });

  return issues;
}

function scanDirectory(dir) {
  const allIssues = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (['.ts', '.js', '.tsx', '.jsx', '.astro'].some((ext) => entry.name.endsWith(ext))) {
        const issues = scanFile(fullPath);
        allIssues.push(...issues);
      }
    }
  }

  walk(dir);
  return allIssues;
}

function runSecurityScan() {
  console.log('🔒 Security Scan\n');

  const allIssues = [];

  SCAN_DIRS.forEach((dir) => {
    if (fs.existsSync(dir)) {
      const issues = scanDirectory(dir);
      allIssues.push(...issues);
    }
  });

  if (allIssues.length === 0) {
    console.log('✅ No obvious security issues found!\n');
    process.exit(0);
  }

  // Group by severity
  const critical = allIssues.filter((i) => i.severity === 'critical');
  const high = allIssues.filter((i) => i.severity === 'high');
  const medium = allIssues.filter((i) => i.severity === 'medium');

  if (critical.length > 0) {
    console.log(`❌ CRITICAL (${critical.length}):`);
    critical.forEach((issue) => {
      console.log(`  ${issue.file}: ${issue.pattern} (${issue.count}x)`);
    });
    console.log();
  }

  if (high.length > 0) {
    console.log(`⚠️  HIGH (${high.length}):`);
    high.forEach((issue) => {
      console.log(`  ${issue.file}: ${issue.pattern} (${issue.count}x)`);
    });
    console.log();
  }

  if (medium.length > 0) {
    console.log(`⚠️  MEDIUM (${medium.length}):`);
    medium.forEach((issue) => {
      console.log(`  ${issue.file}: ${issue.pattern} (${issue.count}x)`);
    });
    console.log();
  }

  console.log(`Total issues: ${allIssues.length}`);

  // High and critical findings must block CI.
  if (critical.length > 0 || high.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

runSecurityScan();
