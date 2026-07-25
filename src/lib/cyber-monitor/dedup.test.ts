import { describe, expect, it } from 'vitest';
import { computeDedupKey } from './dedup';

describe('computeDedupKey', () => {
  it('produces a 64-character hex SHA-256 digest', async () => {
    const key = await computeDedupKey(['acme corp', 'lockbit', '2026-01-01', 'ransomware_live']);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', async () => {
    const a = await computeDedupKey(['Acme Corp', 'LockBit', '2026-01-01', 'ransomware_live']);
    const b = await computeDedupKey(['acme corp', 'lockbit', '2026-01-01', 'ransomware_live']);
    expect(a).toBe(b);
  });

  it('is case-insensitive and trims whitespace', async () => {
    const a = await computeDedupKey([' Acme Corp ', ' LockBit ']);
    const b = await computeDedupKey(['acme corp', 'lockbit']);
    expect(a).toBe(b);
  });

  it('produces a different key for different organisations', async () => {
    const a = await computeDedupKey(['acme corp', 'lockbit', '2026-01-01']);
    const b = await computeDedupKey(['other corp', 'lockbit', '2026-01-01']);
    expect(a).not.toBe(b);
  });

  it('treats null and undefined the same as an empty string', async () => {
    const a = await computeDedupKey(['acme', null]);
    const b = await computeDedupKey(['acme', undefined]);
    const c = await computeDedupKey(['acme', '']);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
