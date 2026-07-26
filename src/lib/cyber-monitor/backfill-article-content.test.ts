import { describe, expect, it, vi } from 'vitest';
import { backfillArticleContent } from './backfill-article-content';

interface FakeRow {
  id: string;
  language: 'en' | 'ro';
  record_type: string;
  organisation_display_name: string | null;
  threat_group_id: string | null;
  discovered_date: string | null;
  incident_date: string | null;
  summary: string | null;
  verification_status: string;
  sector: string | null;
  dedup_key: string;
}

function fakeDb(rows: FakeRow[]) {
  const run = vi.fn().mockResolvedValue(undefined);
  const bind = vi.fn((...args: unknown[]) => ({
    all: async () => ({ results: rows }),
    run: () => run(...args),
  }));
  return {
    db: {
      prepare: () => ({ bind }),
    } as unknown as D1Database,
    run,
  };
}

function makeRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: 'article-1',
    language: 'en',
    record_type: 'ransomware_claim',
    organisation_display_name: 'Acme SRL',
    threat_group_id: 'lockbit',
    discovered_date: '2026-01-05',
    incident_date: null,
    summary: null,
    verification_status: 'unverified_claim',
    sector: 'manufacturing',
    dedup_key: 'abc12345abc12345',
    ...overrides,
  };
}

describe('backfillArticleContent', () => {
  it('does nothing when there are no candidates', async () => {
    const { db } = fakeDb([]);
    const result = await backfillArticleContent(db, {}, 20);
    expect(result).toEqual({ candidates: 0, updated: 0, failed: 0 });
  });

  it('regenerates and updates an English article in place', async () => {
    const { db, run } = fakeDb([makeRow()]);
    const result = await backfillArticleContent(db, {}, 20);

    expect(result).toEqual({ candidates: 1, updated: 1, failed: 0 });
    expect(run).toHaveBeenCalledTimes(1);
    // title, excerpt, body, updated_at, article id
    const [, , body] = run.mock.calls[0];
    expect(body).toContain('LockBit'); // resolved from the curated threat-group profile
    expect(body).toContain('get in touch');
  });

  it('counts a Romanian article as failed when the AI binding is unavailable', async () => {
    const { db, run } = fakeDb([makeRow({ id: 'article-2', language: 'ro' })]);

    const result = await backfillArticleContent(db, {}, 20);

    expect(result).toEqual({ candidates: 1, updated: 0, failed: 1 });
    expect(run).not.toHaveBeenCalled();
  });

  it('localizes the /contact link to /ro/contact in a re-translated Romanian article', async () => {
    const { db, run } = fakeDb([makeRow({ id: 'article-2', language: 'ro' })]);
    const AI = {
      run: vi.fn(async () => ({
        response: JSON.stringify({
          title: 'Titlu RO',
          excerpt: 'Rezumat RO',
          body: 'Text RO cu link [contacteaza-ma](/contact) la final.',
        }),
      })),
    };

    const result = await backfillArticleContent(db, { AI }, 20);

    expect(result).toEqual({ candidates: 1, updated: 1, failed: 0 });
    const [, , body] = run.mock.calls[0];
    expect(body).toContain('(/ro/contact)');
    expect(body).not.toContain('(/contact)');
  });

  it('skips unsupported record types without counting them as failures', async () => {
    const { db, run } = fakeDb([makeRow({ record_type: 'aggregate_statistics' })]);
    const result = await backfillArticleContent(db, {}, 20);

    expect(result).toEqual({ candidates: 0, updated: 0, failed: 0 });
    expect(run).not.toHaveBeenCalled();
  });
});
