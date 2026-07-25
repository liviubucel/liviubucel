import { describe, expect, it } from 'vitest';
import { mispAdapter } from './misp';
import { MISP_CURATED_FEEDS } from './misp-feeds.config';
import type { SyncContext } from '../types';

function context(env: Record<string, unknown> = {}): SyncContext {
  return { db: {} as D1Database, env, now: () => new Date(), triggerType: 'manual' };
}

describe('misp-feeds.config', () => {
  it('is empty by default (no unverified feed URLs are hardcoded)', () => {
    expect(MISP_CURATED_FEEDS).toEqual([]);
  });
});

describe('mispAdapter.fetchUpdates (disabled and unconfigured by default)', () => {
  it('throws when the feature flag is off', async () => {
    await expect(mispAdapter.fetchUpdates(context({ SOURCE_MISP_ENABLED: 'false' }))).rejects.toThrow(
      'misp_not_configured:disabled'
    );
  });

  it('throws when enabled but no curated feeds are configured', async () => {
    await expect(mispAdapter.fetchUpdates(context({ SOURCE_MISP_ENABLED: 'true' }))).rejects.toThrow(
      'misp_not_configured:no_curated_feeds_configured'
    );
  });
});

describe('mispAdapter.normalise (drops binary/personal-data attributes)', () => {
  it('drops a malware-sample attribute entirely', async () => {
    const result = await mispAdapter.normalise({ type: 'malware-sample', value: 'evil.exe|abcdef', category: 'Payload delivery' });
    expect(result).toBeNull();
  });

  it('drops a binary attachment attribute entirely', async () => {
    const result = await mispAdapter.normalise({ type: 'attachment', value: 'report.pdf', category: 'Internal reference' });
    expect(result).toBeNull();
  });

  it('drops an email-address attribute (personal data) entirely', async () => {
    const result = await mispAdapter.normalise({ type: 'email-src', value: 'someone@example.com' });
    expect(result).toBeNull();
  });

  it('keeps and defangs a domain attribute', async () => {
    const result = await mispAdapter.normalise({ type: 'domain', value: 'evil.example.com' });
    expect(result).not.toBeNull();
    expect(result?.defangedValue).toBe('evil[.]example[.]com');
  });

  it('keeps and defangs a URL attribute', async () => {
    const result = await mispAdapter.normalise({ type: 'url', value: 'https://evil.example/x' });
    expect(result?.defangedValue).toBe('hxxps://evil[.]example/x');
  });

  it('never assigns Romania attribution without a verified correlation signal', async () => {
    const result = await mispAdapter.normalise({ type: 'domain', value: 'evil.example.ro' });
    expect(result?.romaniaRelationshipBasis).toBeNull();
    expect(result?.countryConfidence).toBe('low');
  });
});

describe('mispAdapter.validateRecord', () => {
  it('rejects a record missing the required value field', () => {
    expect(mispAdapter.validateRecord({ type: 'domain' })).toBe(false);
  });

  it('accepts a minimal valid attribute', () => {
    expect(mispAdapter.validateRecord({ type: 'domain', value: 'x.example' })).toBe(true);
  });
});
