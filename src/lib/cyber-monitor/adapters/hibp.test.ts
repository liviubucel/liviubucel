import { afterEach, describe, expect, it, vi } from 'vitest';
import { hibpAdapter, HIBP_BREACHES_ENDPOINT } from './hibp';
import type { SyncContext } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

function fakeContext(matchedOrganisationId: string | null): SyncContext {
  const db = {
    prepare: () => ({
      bind: () => ({
        first: async () => (matchedOrganisationId ? { organisation_id: matchedOrganisationId } : null),
      }),
    }),
  } as unknown as D1Database;

  return { db, env: {}, now: () => new Date('2026-01-15T00:00:00Z'), triggerType: 'manual' };
}

const baseBreach = {
  Name: 'ExampleBreach',
  Title: 'Example Breach',
  Domain: 'example-org.ro',
  BreachDate: '2025-06-01',
  AddedDate: '2025-06-10T00:00:00Z',
  ModifiedDate: '2025-06-10T00:00:00Z',
  PwnCount: 12345,
  Description: 'In <strong>June 2025</strong>, <script>alert(1)</script>Example Org was breached.',
  DataClasses: ['Email addresses', 'Passwords'],
  IsVerified: true,
  IsFabricated: false,
  IsSensitive: false,
  IsRetired: false,
  IsSpamList: false,
};

describe('hibpAdapter.validateRecord', () => {
  it('accepts a well-formed breach record', () => {
    expect(hibpAdapter.validateRecord(baseBreach)).toBe(true);
  });

  it('rejects a record missing the required Name field', () => {
    const { Name, ...rest } = baseBreach;
    expect(hibpAdapter.validateRecord(rest)).toBe(false);
  });

  it('rejects a non-object record', () => {
    expect(hibpAdapter.validateRecord('nope')).toBe(false);
  });
});

describe('hibpAdapter.normalise', () => {
  it('throws when no D1 context is provided (domain matching requires it)', async () => {
    await expect(hibpAdapter.normalise(baseBreach)).rejects.toThrow('hibp_adapter_requires_db_context');
  });

  it('returns null for a .ro domain with no verified organisation match (review candidate only)', async () => {
    const result = await hibpAdapter.normalise(baseBreach, fakeContext(null));
    expect(result).toBeNull();
  });

  it('returns null for a non-.ro, non-matched domain entirely', async () => {
    const result = await hibpAdapter.normalise({ ...baseBreach, Domain: 'foreign.example' }, fakeContext(null));
    expect(result).toBeNull();
  });

  it('publishes when the domain matches a verified Romanian organisation', async () => {
    const result = await hibpAdapter.normalise(baseBreach, fakeContext('org-123'));
    expect(result).not.toBeNull();
    expect(result?.organisationId).toBe('org-123');
    expect(result?.romaniaRelationshipBasis).toBe('verified_organisation_domain');
    expect(result?.countryConfidence).toBe('high');
    expect(result?.recordType).toBe('verified_breach');
  });

  it('sets verification_status to source_verified when IsVerified is true', async () => {
    const result = await hibpAdapter.normalise({ ...baseBreach, IsVerified: true }, fakeContext('org-123'));
    expect(result?.verificationStatus).toBe('source_verified');
  });

  it('sets verification_status to unverified_claim when IsVerified is false', async () => {
    const result = await hibpAdapter.normalise({ ...baseBreach, IsVerified: false }, fakeContext('org-123'));
    expect(result?.verificationStatus).toBe('unverified_claim');
  });

  it('keeps BreachDate and AddedDate as distinct fields', async () => {
    const result = await hibpAdapter.normalise(
      { ...baseBreach, BreachDate: '2020-01-01', AddedDate: '2025-06-10T00:00:00Z' },
      fakeContext('org-123')
    );
    expect(result?.incidentDate).toBe('2020-01-01');
    expect(result?.discoveredDate).toBe('2025-06-10T00:00:00Z');
    expect(result?.incidentDate).not.toBe(result?.discoveredDate);
  });

  it('sanitises the HTML description before storing it in the summary', async () => {
    const result = await hibpAdapter.normalise(baseBreach, fakeContext('org-123'));
    expect(result?.summary).not.toContain('<script>');
    expect(result?.summary).not.toContain('alert(1)');
    expect(result?.summary).toContain('June 2025');
  });

  it('never claims official Romanian-authority confirmation in the summary', async () => {
    const result = await hibpAdapter.normalise(baseBreach, fakeContext('org-123'));
    expect(result?.summary).toContain('not confirmation by a Romanian authority');
  });

  it('uses the stable HIBP Name as the upstream record identifier', async () => {
    const result = await hibpAdapter.normalise(baseBreach, fakeContext('org-123'));
    expect(result?.source.upstreamRecordId).toBe('ExampleBreach');
  });
});

describe('hibpAdapter.fetchUpdates', () => {
  it('fetches the public breaches endpoint and returns the parsed array', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify([baseBreach]), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const records = await hibpAdapter.fetchUpdates({} as SyncContext);

    expect(fetchSpy).toHaveBeenCalledWith(HIBP_BREACHES_ENDPOINT, expect.any(Object));
    expect(records).toHaveLength(1);
  });

  it('throws on a non-array response shape', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ oops: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(hibpAdapter.fetchUpdates({} as SyncContext)).rejects.toThrow('unexpected_shape');
  });

  it('throws when the request fails', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(hibpAdapter.fetchUpdates({} as SyncContext)).rejects.toThrow('hibp_fetch_failed');
  });
});
