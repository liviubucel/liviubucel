import { afterEach, describe, expect, it, vi } from 'vitest';
import { leakixAdapter } from './leakix';
import type { SyncContext } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

function context(env: Record<string, unknown> = {}): SyncContext {
  return { db: {} as D1Database, env, now: () => new Date('2026-03-15T00:00:00Z'), triggerType: 'manual' };
}

describe('leakixAdapter.fetchUpdates (disabled by default)', () => {
  it('throws a specific "disabled" error when the feature flag is off', async () => {
    await expect(leakixAdapter.fetchUpdates(context({ SOURCE_LEAKIX_ENABLED: 'false' }))).rejects.toThrow(
      'leakix_not_configured:disabled'
    );
  });

  it('throws a specific "missing_api_key" error when enabled but no key is set', async () => {
    await expect(leakixAdapter.fetchUpdates(context({ SOURCE_LEAKIX_ENABLED: 'true' }))).rejects.toThrow(
      'leakix_not_configured:missing_api_key'
    );
  });

  it('never calls fetch at all when not configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(leakixAdapter.fetchUpdates(context())).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('leakixAdapter.normalise (redaction)', () => {
  const romanianEvent = {
    ip: '81.180.22.9',
    host: 'server.example',
    port: 6379,
    protocol: 'redis',
    event_type: 'leak',
    event_severity: 'high' as const,
    time: '2026-03-10T12:00:00Z',
    geoip: { country_iso_code: 'RO' },
    network: { organization_name: 'Example Hosting SRL', autonomous_system_number: 12345 },
  };

  it('masks the IPv4 address to only its first octet', async () => {
    const result = await leakixAdapter.normalise(romanianEvent, context());
    expect(result?.maskedIp).toBe('81.x.x.x');
  });

  it('never surfaces an IPv6 address at all', async () => {
    const result = await leakixAdapter.normalise({ ...romanianEvent, ip: '2001:db8::1' }, context());
    expect(result?.maskedIp).toBeNull();
  });

  it('does not include the hostname, port, or protocol as an exploitable path in the output shape', () => {
    // The NormalisedExposure type has no field for hostname/port at all -
    // this is a structural guarantee, verified by checking the produced
    // object's keys instead of just asserting an omission by value.
    return leakixAdapter.normalise(romanianEvent, context()).then((result) => {
      expect(result).not.toHaveProperty('host');
      expect(result).not.toHaveProperty('port');
      expect(result).not.toHaveProperty('url');
      expect(result).not.toHaveProperty('banner');
      expect(result).not.toHaveProperty('credentials');
    });
  });

  it('never infers a sector from the raw event', async () => {
    const result = await leakixAdapter.normalise(romanianEvent, context());
    expect(result?.sector).toBeNull();
  });

  it('returns null for a non-Romania event', async () => {
    const result = await leakixAdapter.normalise({ ...romanianEvent, geoip: { country_iso_code: 'DE' } }, context());
    expect(result).toBeNull();
  });

  it('preserves ASN and hosting organisation for aggregation', async () => {
    const result = await leakixAdapter.normalise(romanianEvent, context());
    expect(result?.hostingAsn).toBe(12345);
    expect(result?.hostingOrganisation).toBe('Example Hosting SRL');
  });

  it('derives the observed month from the event timestamp', async () => {
    const result = await leakixAdapter.normalise(romanianEvent, context());
    expect(result?.observedMonth).toBe('2026-03');
  });
});
