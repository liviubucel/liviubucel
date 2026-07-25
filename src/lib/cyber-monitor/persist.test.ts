import { describe, expect, it } from 'vitest';
import { persistIncident } from './persist';
import type { NormalisedIncident } from './types';

function createFakeIncidentsDb() {
  const incidents = new Map<string, Record<string, unknown>>();
  const sources: Record<string, unknown>[] = [];

  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (sql.startsWith('INSERT INTO incidents')) {
                const [id, , , , , , , , , , , , , , editorialStatus, , , , dedupKey, publishedAt] = args as unknown[];
                incidents.set(dedupKey as string, { id, editorial_status: editorialStatus, published_at: publishedAt });
                return { success: true };
              }
              if (sql.startsWith('INSERT OR IGNORE INTO incident_sources')) {
                sources.push({ args });
                return { success: true };
              }
              if (sql.startsWith('UPDATE incidents')) {
                return { success: true };
              }
              throw new Error(`unexpected SQL: ${sql}`);
            },
            async first<T>() {
              if (sql.startsWith('SELECT id FROM incidents WHERE dedup_key')) {
                const [dedupKey] = args as [string];
                const row = incidents.get(dedupKey);
                return (row ? { id: row.id } : null) as T;
              }
              throw new Error(`unexpected SQL (first): ${sql}`);
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, incidents, sources };
}

function baseIncident(overrides: Partial<NormalisedIncident> = {}): NormalisedIncident {
  return {
    slug: 'x',
    recordType: 'verified_breach',
    organisationId: 'org-1',
    organisationDisplayName: 'Example',
    threatGroupId: null,
    countryCode: 'RO',
    romaniaRelationshipBasis: 'verified_organisation_domain',
    countryConfidence: 'high',
    incidentDate: '2026-01-01',
    discoveredDate: '2026-01-02',
    firstObserved: '2026-01-02',
    lastObserved: '2026-01-02',
    verificationStatus: 'source_verified',
    editorialStatus: 'published',
    summary: 's',
    sector: null,
    independentlyConfirmed: false,
    dedupKey: 'dk-1',
    source: {
      sourceId: 'hibp',
      upstreamRecordId: 'u-1',
      sourceUrl: null,
      title: 't',
      sourcePublicationDate: '2026-01-01',
      payloadHash: 'h',
      authoritative: false,
      corroboratesClaim: false,
      sanitisedMetadata: {},
    },
    ...overrides,
  };
}

describe('persistIncident - newlyPublished gating', () => {
  it('marks newlyPublished=true and sets published_at for an editorialStatus=published record', async () => {
    const { db, incidents } = createFakeIncidentsDb();
    const result = await persistIncident(db, baseIncident({ editorialStatus: 'published' }), '2026-01-05T00:00:00Z');

    expect(result.outcome).toBe('inserted');
    expect(result.newlyPublished).toBe(true);
    expect(incidents.get('dk-1')?.published_at).toBe('2026-01-05T00:00:00Z');
  });

  it('marks newlyPublished=false and leaves published_at null for a needs_review record (sensitive breach)', async () => {
    const { db, incidents } = createFakeIncidentsDb();
    const result = await persistIncident(
      db,
      baseIncident({ editorialStatus: 'needs_review', dedupKey: 'dk-2' }),
      '2026-01-05T00:00:00Z'
    );

    expect(result.newlyPublished).toBe(false);
    expect(incidents.get('dk-2')?.published_at).toBeNull();
  });

  it('does not re-publish or change newlyPublished on an update to an existing incident', async () => {
    const { db } = createFakeIncidentsDb();
    await persistIncident(db, baseIncident({ dedupKey: 'dk-3' }), '2026-01-05T00:00:00Z');
    const second = await persistIncident(db, baseIncident({ dedupKey: 'dk-3' }), '2026-01-06T00:00:00Z');

    expect(second.outcome).toBe('updated');
    expect(second.newlyPublished).toBe(false);
  });
});
