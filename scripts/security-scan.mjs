/**
 * Security Scanning Script
 * Checks for common security issues in codebase
 */

import fs from 'fs';
import path from 'path';

const SCAN_DIRS = ['./src', './scripts'];
const DANGEROUS_PATTERNS = [
  { pattern: /eval\s*\(/g, name: 'eval()', severity: 'critical' },
  { pattern: /innerHTML\s*=/g, name: 'innerHTML assignment', severity: 'high' },
  { pattern: /dangerouslySetInnerHTML/g, name: 'dangerouslySetInnerHTML', severity: 'high' },
  { pattern: /require\(.*\$.*\)/g, name: 'dynamic require with variable', severity: 'high' },
  { pattern: /fetch\(['"]\$\{/g, name: 'dynamic URL fetch', severity: 'medium' },
  { pattern: /process\.env\..*PASSWORD/i, name: 'password in env var name', severity: 'high' },
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  DANGEROUS_PATTERNS.forEach(({ pattern, name, severity }) => {
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
      // Skip node_modules, .git, dist, build
      if (['node_modules', '.git', 'dist', 'build', '.astro'].includes(entry.name)) continue;

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

  // Exit with error if critical issues
  if (critical.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

runSecurityScan();
