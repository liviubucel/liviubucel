import { afterEach, describe, expect, it, vi } from 'vitest';
import { threatfoxAdapter, THREATFOX_ENDPOINT, THREATFOX_RECENT_DAYS } from './threatfox';
import type { SyncContext } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

function context(env: Record<string, unknown> = {}): SyncContext {
  return { db: {} as D1Database, env, now: () => new Date(), triggerType: 'manual' };
}

describe('threatfoxAdapter.fetchUpdates (disabled by default)', () => {
  it('throws when the feature flag is off', async () => {
    await expect(threatfoxAdapter.fetchUpdates(context({ SOURCE_THREATFOX_ENABLED: 'false' }))).rejects.toThrow(
      'threatfox_not_configured:disabled'
    );
  });

  it('throws when enabled but no Auth-Key is set', async () => {
    await expect(threatfoxAdapter.fetchUpdates(context({ SOURCE_THREATFOX_ENABLED: 'true' }))).rejects.toThrow(
      'threatfox_not_configured:missing_auth_key'
    );
  });

  it('requests a bounded recent window, never an unbounded historical dump', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await threatfoxAdapter.fetchUpdates(context({ SOURCE_THREATFOX_ENABLED: 'true', ABUSECH_AUTH_KEY: 'key' }));

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.days).toBe(THREATFOX_RECENT_DAYS);
    expect(body.days).toBeLessThanOrEqual(7);
    expect(fetchSpy).toHaveBeenCalledWith(THREATFOX_ENDPOINT, expect.any(Object));
  });
});

describe('threatfoxAdapter.normalise (defanging and attribution safety)', () => {
  const baseIoc = {
    id: 12345,
    ioc: 'evil.example.com',
    ioc_type: 'domain',
    threat_type: 'botnet_cc',
    malware_printable: 'SomeMalware',
    first_seen: '2026-03-01 00:00:00',
    tags: ['ransomware'],
  };

  it('defangs a domain IOC', async () => {
    const result = await threatfoxAdapter.normalise(baseIoc);
    expect(result?.defangedValue).toBe('evil[.]example[.]com');
    expect(result?.defangedValue).not.toContain('evil.example.com');
  });

  it('defangs a URL IOC with the scheme rewritten too', async () => {
    const result = await threatfoxAdapter.normalise({
      ...baseIoc,
      ioc: 'https://evil.example/panel',
      ioc_type: 'url',
    });
    expect(result?.defangedValue).toBe('hxxps://evil[.]example/panel');
  });

  it('defangs an IP IOC', async () => {
    const result = await threatfoxAdapter.normalise({ ...baseIoc, ioc: '198.51.100.7', ioc_type: 'ip:port' });
    expect(result?.defangedValue).toBe('198[.]51[.]100[.]7');
  });

  it('never assigns Romania attribution without a verified signal, even for a .ro-looking domain', async () => {
    const result = await threatfoxAdapter.normalise({ ...baseIoc, ioc: 'evil.example.ro' });
    expect(result?.romaniaRelationshipBasis).toBeNull();
    expect(result?.countryConfidence).toBe('low');
  });

  it('treats an IOC without last_seen as active', async () => {
    const result = await threatfoxAdapter.normalise(baseIoc);
    expect(result?.active).toBe(true);
  });

  it('treats an IOC with a last_seen timestamp as no longer active', async () => {
    const result = await threatfoxAdapter.normalise({ ...baseIoc, last_seen: '2026-03-05 00:00:00' });
    expect(result?.active).toBe(false);
  });

  it('preserves malware family and threat type for context, never fabricating attribution', async () => {
    const result = await threatfoxAdapter.normalise(baseIoc);
    expect(result?.malwareFamily).toBe('SomeMalware');
    expect(result?.threatType).toBe('botnet_cc');
  });
});

describe('threatfoxAdapter.validateRecord', () => {
  it('rejects a record missing the required ioc field', () => {
    expect(threatfoxAdapter.validateRecord({ id: 1, ioc_type: 'domain' })).toBe(false);
  });

  it('accepts a minimal valid record', () => {
    expect(threatfoxAdapter.validateRecord({ id: 1, ioc: 'x.example', ioc_type: 'domain' })).toBe(true);
  });
});
