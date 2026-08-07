#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const required = [
  'pnpm-lock.yaml',
  'studio-liviubucel/pnpm-lock.yaml',
];

const forbidden = [
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'studio-liviubucel/package-lock.json',
  'studio-liviubucel/npm-shrinkwrap.json',
  'studio-liviubucel/yarn.lock',
  'studio-liviubucel/bun.lock',
  'studio-liviubucel/bun.lockb',
];

const missing = required.filter((path) => !existsSync(resolve(root, path)));
const unexpected = forbidden.filter((path) => existsSync(resolve(root, path)));

if (missing.length > 0 || unexpected.length > 0) {
  if (missing.length > 0) {
    console.error(`Missing required pnpm lockfile(s): ${missing.join(', ')}`);
  }

  if (unexpected.length > 0) {
    console.error(
      `Unexpected lockfile(s) detected: ${unexpected.join(', ')}. ` +
        'This repository is pnpm-only; stale lockfiles can create false or duplicate dependency-security alerts.'
    );
  }

  process.exit(1);
}

console.log('Lockfile policy OK: root and Studio use pnpm only.');
