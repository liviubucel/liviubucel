import { describe, expect, it } from 'vitest';
import { runSourceSync } from './sync-runner';
import { SourceNotConfiguredError } from './source-config';
import type { SyncContext, ThreatSourceAdapter } from './types';

interface FakeRow {
  [key: string]: unknown;
}

/** Minimal fake D1 covering exactly the tables/queries sync-runner and lock touch. */
function createFakeDb() {
  const locks = new Map<string, FakeRow>();
  const syncRuns = new Map<string, FakeRow>();
  const sourceHealth = new Map<string, FakeRow>();

  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (sql.startsWith('DELETE FROM sync_locks WHERE source_id = ?1 AND expires_at')) {
                const [sourceId, nowIso] = args as [string, string];
                const existing = locks.get(sourceId);
                if (existing && (existing.expires_at as string) < nowIso) locks.delete(sourceId);
                return { success: true };
              }
              if (sql.startsWith('INSERT INTO sync_locks')) {
                const [sourceId, lockOwner, acquiredAt, expiresAt] = args as [string, string, string, string];
                if (locks.has(sourceId)) throw new Error('UNIQUE constraint failed');
                locks.set(sourceId, { lock_owner: lockOwner, acquired_at: acquiredAt, expires_at: expiresAt });
                return { success: true };
              }
              if (sql.startsWith('DELETE FROM sync_locks WHERE source_id = ?1 AND lock_owner')) {
                const [sourceId, lockOwner] = args as [string, string];
                if (locks.get(sourceId)?.lock_owner === lockOwner) locks.delete(sourceId);
                return { success: true };
              }
              if (sql.startsWith('INSERT INTO sync_runs')) {
                const [id, sourceId, triggerType, startedAt, status] = args as [string, string, string, string, string];
                syncRuns.set(id, { id, source_id: sourceId, trigger_type: triggerType, started_at: startedAt, status });
                return { success: true };
              }
              if (sql.startsWith('UPDATE sync_runs SET')) {
                const [completedAt, status, received, accepted, rejected, inserted, updated, errorCode, errorMessage, id] =
                  args as [string, string, number, number, number, number, number, string | null, string | null, string];
                const row = syncRuns.get(id) ?? {};
                syncRuns.set(id, {
                  ...row,
                  completed_at: completedAt,
                  status,
                  records_received: received,
                  records_accepted: accepted,
                  records_rejected: rejected,
                  records_inserted: inserted,
                  records_updated: updated,
                  error_code: errorCode,
                  sanitised_error_message: errorMessage,
                });
                return { success: true };
              }
              if (sql.startsWith('UPDATE source_health SET')) {
                const [isSuccess, nowIso, consecutiveFailures, sourceId] = args as [number, string, number, string];
                const row = sourceHealth.get(sourceId) ?? {};
                sourceHealth.set(sourceId, {
                  ...row,
                  last_success_at: isSuccess === 1 ? nowIso : row.last_success_at,
                  last_failure_at: isSuccess === 0 ? nowIso : row.last_failure_at,
                  consecutive_failures: consecutiveFailures,
                  updated_at: nowIso,
                });
                return { success: true };
              }
              if (sql.startsWith('INSERT INTO source_health')) {
                const [sourceId, lastSuccessAt, lastFailureAt, consecutiveFailures] = args as [
                  string,
                  string | null,
                  string | null,
                  number,
                ];
                sourceHealth.set(sourceId, {
                  source_id: sourceId,
                  last_success_at: lastSuccessAt,
                  last_failure_at: lastFailureAt,
                  consecutive_failures: consecutiveFailures,
                });
                return { success: true };
              }
              throw new Error(`unexpected SQL in fake db (run): ${sql}`);
            },
            async first<T>() {
              if (sql.startsWith('SELECT consecutive_failures FROM source_health')) {
                const [sourceId] = args as [string];
                return (sourceHealth.get(sourceId) as T) ?? null;
              }
              throw new Error(`unexpected SQL in fake db (first): ${sql}`);
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, locks, syncRuns, sourceHealth };
}

function context(db: D1Database, now = new Date('2026-01-01T00:00:00Z')): SyncContext {
  return { db, env: {}, now: () => now, triggerType: 'manual' };
}

const fakeAdapter = (
  overrides: Partial<ThreatSourceAdapter<{ ok: boolean }, { value: string }>> = {}
): ThreatSourceAdapter<{ ok: boolean }, { value: string }> => ({
  sourceId: 'ransomware_live',
  async fetchUpdates() {
    return [{ ok: true }, { ok: false }];
  },
  validateRecord(record): record is { ok: boolean } {
    return typeof record === 'object' && record !== null && 'ok' in record;
  },
  async normalise(record) {
    return record.ok ? { value: 'x' } : null;
  },
  ...overrides,
});

describe('runSourceSync', () => {
  it('runs to success and records sync_runs + source_health', async () => {
    const { db, syncRuns, sourceHealth } = createFakeDb();
    const persisted: string[] = [];

    const summary = await runSourceSync(fakeAdapter(), context(db), async (record) => {
      persisted.push(record.value);
      return 'inserted';
    });

    expect(summary.status).toBe('success');
    expect(summary.recordsReceived).toBe(2);
    expect(summary.recordsAccepted).toBe(2);
    expect(summary.recordsInserted).toBe(1); // the second record normalises to null (ok: false)
    expect(persisted).toEqual(['x']);

    const runRow = [...syncRuns.values()][0];
    expect(runRow.status).toBe('success');

    const healthRow = sourceHealth.get('ransomware_live');
    expect(healthRow?.consecutive_failures).toBe(0);
    expect(healthRow?.last_success_at).toBeTruthy();
  });

  it('releases the lock after completion, allowing a subsequent run', async () => {
    const { db, locks } = createFakeDb();

    await runSourceSync(fakeAdapter(), context(db), async () => 'inserted');

    expect(locks.has('ransomware_live')).toBe(false);
  });

  it('skips the run when another run already holds the lock', async () => {
    const { db, locks } = createFakeDb();
    locks.set('ransomware_live', {
      lock_owner: 'someone-else',
      acquired_at: '2026-01-01T00:00:00Z',
      expires_at: '2026-01-01T00:10:00Z', // still valid
    });

    const summary = await runSourceSync(fakeAdapter(), context(db), async () => 'inserted');

    expect(summary.status).toBe('skipped_locked');
    expect(summary.recordsReceived).toBe(0);
  });

  it('marks the run as skipped_not_configured (and health as a failure) when the source throws SourceNotConfiguredError', async () => {
    const { db, sourceHealth } = createFakeDb();

    const adapter = fakeAdapter({
      async fetchUpdates() {
        throw new SourceNotConfiguredError('leakix', 'disabled');
      },
    });

    const summary = await runSourceSync(adapter, context(db), async () => 'inserted');

    expect(summary.status).toBe('skipped_not_configured');
    expect(summary.errorCode).toBe('not_configured');
    expect(sourceHealth.get('ransomware_live')?.consecutive_failures).toBe(1);
  });

  it('marks the run as failed on an unexpected fetch error, without crashing', async () => {
    const { db } = createFakeDb();

    const adapter = fakeAdapter({
      async fetchUpdates() {
        throw new Error('network exploded');
      },
    });

    const summary = await runSourceSync(adapter, context(db), async () => 'inserted');

    expect(summary.status).toBe('failed');
    expect(summary.errorCode).toBe('fetch_or_process_error');
  });

  it('rejects an invalid record via validateRecord without calling normalise or persist', async () => {
    const { db } = createFakeDb();
    let normaliseCalls = 0;

    const adapter = fakeAdapter({
      async fetchUpdates() {
        return [{ ok: true }];
      },
      validateRecord(record): record is { ok: boolean } {
        return false;
      },
      async normalise(record) {
        normaliseCalls += 1;
        return record.ok ? { value: 'x' } : null;
      },
    });

    const summary = await runSourceSync(adapter, context(db), async () => 'inserted');

    expect(summary.recordsRejected).toBe(1);
    expect(summary.recordsAccepted).toBe(0);
    expect(normaliseCalls).toBe(0);
  });

  it('marks the run partial when some records are rejected and others succeed', async () => {
    const { db } = createFakeDb();

    const summary = await runSourceSync(fakeAdapter(), context(db), async () => 'inserted');
    // fakeAdapter's second record fails validateRecord's implicit acceptance
    // (it's a valid shape but normalises to null) - use a variant that
    // actually fails validateRecord to produce a genuine rejection.
    expect(summary.status).toBe('success'); // baseline sanity check

    const partialAdapter = fakeAdapter({
      async fetchUpdates() {
        return [{ ok: true }, { bad: true } as unknown as { ok: boolean }];
      },
    });
    const partialSummary = await runSourceSync(partialAdapter, context(db), async () => 'inserted');
    expect(partialSummary.status).toBe('partial');
    expect(partialSummary.recordsRejected).toBe(1);
    expect(partialSummary.recordsAccepted).toBe(1);
  });

  it('never lets a persist() failure crash the whole run - it counts as rejected and continues', async () => {
    const { db } = createFakeDb();

    const adapter = fakeAdapter({
      async fetchUpdates() {
        return [{ ok: true }, { ok: true }];
      },
    });

    let calls = 0;
    const summary = await runSourceSync(adapter, context(db), async () => {
      calls += 1;
      if (calls === 1) throw new Error('db write failed');
      return 'inserted';
    });

    expect(summary.recordsInserted).toBe(1);
    expect(summary.recordsRejected).toBe(1);
    expect(calls).toBe(2); // the second record was still attempted
  });
});
