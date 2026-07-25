import { afterEach, describe, expect, it, vi } from 'vitest';
import { ransomwareLiveAdapter, RANSOMWARE_LIVE_RO_ENDPOINT } from './ransomware-live';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ransomwareLiveAdapter.validateRecord', () => {
  it('accepts a record with victim + group_name', () => {
    expect(
      ransomwareLiveAdapter.validateRecord({
        victim: 'Acme Corp',
        group_name: 'LockBit',
        country: 'RO',
        discovered: '2026-01-05',
      })
    ).toBe(true);
  });

  it('accepts a record using the post_title/group field variants', () => {
    expect(
      ransomwareLiveAdapter.validateRecord({
        post_title: 'Some Company',
        group: 'BlackCat',
      })
    ).toBe(true);
  });

  it('rejects a non-object record', () => {
    expect(ransomwareLiveAdapter.validateRecord('not an object')).toBe(false);
    expect(ransomwareLiveAdapter.validateRecord(null)).toBe(false);
    expect(ransomwareLiveAdapter.validateRecord(42)).toBe(false);
  });
});

describe('ransomwareLiveAdapter.normalise', () => {
  it('produces a ransomware_claim with unverified_claim / candidate status and required wording', async () => {
    const result = await ransomwareLiveAdapter.normalise({
      victim: 'Acme Corp SRL',
      group_name: 'LockBit',
      country: 'RO',
      discovered: '2026-01-05',
    });

    expect(result).not.toBeNull();
    expect(result?.recordType).toBe('ransomware_claim');
    expect(result?.verificationStatus).toBe('unverified_claim');
    expect(result?.editorialStatus).toBe('published');
    expect(result?.independentlyConfirmed).toBe(false);
    expect(result?.countryConfidence).toBe('high');
    expect(result?.romaniaRelationshipBasis).toBe('source_country_ro');
    expect(result?.summary).toContain('has not been independently confirmed');
    expect(result?.summary).not.toMatch(/\bconfirmed breach\b/i);
    expect(result?.summary).not.toMatch(/\bhacked\b/i);
  });

  it('never sets or exposes a source URL (no direct links to leak sites)', async () => {
    const result = await ransomwareLiveAdapter.normalise({
      victim: 'Acme Corp SRL',
      group_name: 'LockBit',
      country: 'RO',
    });
    expect(result?.source.sourceUrl).toBeNull();
  });

  it('returns null when the organisation name is missing', async () => {
    const result = await ransomwareLiveAdapter.normalise({ group_name: 'LockBit', country: 'RO' });
    expect(result).toBeNull();
  });

  it('returns null when the threat group is missing', async () => {
    const result = await ransomwareLiveAdapter.normalise({ victim: 'Acme Corp', country: 'RO' });
    expect(result).toBeNull();
  });

  it('returns null when the upstream country explicitly disagrees with Romania', async () => {
    const result = await ransomwareLiveAdapter.normalise({
      victim: 'Foreign Co',
      group_name: 'LockBit',
      country: 'FR',
    });
    expect(result).toBeNull();
  });

  it('produces a deterministic slug and dedup key for the same input', async () => {
    const a = await ransomwareLiveAdapter.normalise({ victim: 'Acme Corp', group_name: 'LockBit', country: 'RO' });
    const b = await ransomwareLiveAdapter.normalise({ victim: 'Acme Corp', group_name: 'LockBit', country: 'RO' });
    expect(a?.dedupKey).toBe(b?.dedupKey);
    expect(a?.slug).toBe(b?.slug);
  });
});

describe('ransomwareLiveAdapter.fetchUpdates', () => {
  it('fetches the Romania-scoped endpoint and returns the parsed array', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ victim: 'Acme', group_name: 'LockBit', country: 'RO' }]), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const records = await ransomwareLiveAdapter.fetchUpdates({} as never);

    expect(fetchSpy).toHaveBeenCalledWith(RANSOMWARE_LIVE_RO_ENDPOINT, expect.any(Object));
    expect(records).toHaveLength(1);
    expect(records[0].victim).toBe('Acme');
  });

  it('throws (does not silently continue) on a non-array response shape', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ not: 'an array' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(ransomwareLiveAdapter.fetchUpdates({} as never)).rejects.toThrow('unexpected_shape');
  });

  it('throws when the upstream request fails', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('error', { status: 400 }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(ransomwareLiveAdapter.fetchUpdates({} as never)).rejects.toThrow('ransomware_live_fetch_failed');
  });
});
