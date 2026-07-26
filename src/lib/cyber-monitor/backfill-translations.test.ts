import { describe, expect, it, vi } from 'vitest';
import { backfillRomanianTranslations } from './backfill-translations';

interface FakeRow {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  article_type: 'incident_brief';
  related_incident_id: string;
  dedup_key: string;
}

function fakeDb(rows: FakeRow[]) {
  const run = vi.fn().mockResolvedValue(undefined);
  return {
    db: {
      prepare: () => ({
        bind: () => ({
          all: async () => ({ results: rows }),
          run,
        }),
      }),
    } as unknown as D1Database,
    run,
  };
}

function makeRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: 'article-1',
    title: 'Acme SRL breach',
    excerpt: 'A short summary.',
    body: 'Details.',
    article_type: 'incident_brief',
    related_incident_id: 'incident-1',
    dedup_key: 'abc12345abc12345',
    ...overrides,
  };
}

describe('backfillRomanianTranslations', () => {
  it('does nothing when there are no untranslated candidates', async () => {
    const { db } = fakeDb([]);
    const result = await backfillRomanianTranslations(db, {}, 20);
    expect(result).toEqual({ candidates: 0, translated: 0, failed: 0 });
  });

  it('counts a candidate as failed when translation is unavailable (no AI binding)', async () => {
    const { db } = fakeDb([makeRow()]);
    const result = await backfillRomanianTranslations(db, {}, 20);
    expect(result).toEqual({ candidates: 1, translated: 0, failed: 1 });
  });

  it('translates and persists a RO article for each candidate when AI is available', async () => {
    const { db, run } = fakeDb([makeRow(), makeRow({ id: 'article-2', related_incident_id: 'incident-2' })]);
    const AI = {
      run: vi.fn(async () => ({
        response: JSON.stringify({ title: 'Titlu RO', excerpt: 'Rezumat RO', body: 'Corp RO' }),
      })),
    };

    const result = await backfillRomanianTranslations(db, { AI }, 20);

    expect(result).toEqual({ candidates: 2, translated: 2, failed: 0 });
    expect(run).toHaveBeenCalledTimes(2);
  });
});
