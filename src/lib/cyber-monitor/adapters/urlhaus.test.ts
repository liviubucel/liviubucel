import { afterEach, describe, expect, it, vi } from 'vitest';
import { urlhausAdapter, URLHAUS_RECENT_ENDPOINT } from './urlhaus';
import type { SyncContext } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

function context(env: Record<string, unknown> = {}): SyncContext {
  return { db: {} as D1Database, env, now: () => new Date(), triggerType: 'manual' };
}

describe('urlhausAdapter.fetchUpdates (disabled by default)', () => {
  it('throws when the feature flag is off', async () => {
    await expect(urlhausAdapter.fetchUpdates(context({ SOURCE_URLHAUS_ENABLED: 'false' }))).rejects.toThrow(
      'urlhaus_not_configured:disabled'
    );
  });

  it('throws when enabled but no Auth-Key is set', async () => {
    await expect(urlhausAdapter.fetchUpdates(context({ SOURCE_URLHAUS_ENABLED: 'true' }))).rejects.toThrow(
      'urlhaus_not_configured:missing_auth_key'
    );
  });

  it('calls the recent-URLs endpoint, not a full historical export', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ urls: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await urlhausAdapter.fetchUpdates(context({ SOURCE_URLHAUS_ENABLED: 'true', ABUSECH_AUTH_KEY: 'key' }));

    expect(fetchSpy).toHaveBeenCalledWith(URLHAUS_RECENT_ENDPOINT, expect.any(Object));
  });
});

describe('urlhausAdapter.normalise (defanging)', () => {
  const entry = {
    id: 999,
    url: 'https://malicious.example/payload.exe',
    url_status: 'online',
    threat: 'malware_download',
    date_added: '2026-03-01 00:00:00',
  };

  it('defangs the URL exactly per the mandated scheme + dot rewriting', async () => {
    const result = await urlhausAdapter.normalise(entry);
    expect(result?.defangedValue).toBe('hxxps://malicious[.]example/payload[.]exe');
  });

  it('never leaves the raw clickable URL anywhere in the output', async () => {
    const result = await urlhausAdapter.normalise(entry);
    expect(JSON.stringify(result)).not.toContain('https://malicious.example');
  });

  it('marks an "offline" URL as inactive', async () => {
    const result = await urlhausAdapter.normalise({ ...entry, url_status: 'offline' });
    expect(result?.active).toBe(false);
  });

  it('marks an "online" URL as active', async () => {
    const result = await urlhausAdapter.normalise(entry);
    expect(result?.active).toBe(true);
  });

  it('never assigns Romania attribution without a verified correlation signal', async () => {
    const result = await urlhausAdapter.normalise(entry);
    expect(result?.romaniaRelationshipBasis).toBeNull();
    expect(result?.countryConfidence).toBe('low');
  });
});
