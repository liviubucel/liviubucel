// Romania Cyber Monitor - generic sync orchestration for a single source:
// acquire lock -> fetch -> validate -> normalise -> persist -> record
// sync_runs + source_health -> release lock. One source's failure never
// touches another source's lock, run, or health row.

import type { SourceId, SyncContext, ThreatSourceAdapter } from './types';
import { acquireLock, releaseLock } from './lock';
import { SourceNotConfiguredError } from './source-config';

export type SyncRunStatus = 'success' | 'partial' | 'failed' | 'skipped_locked' | 'skipped_not_configured';

export interface SyncRunSummary {
  sourceId: SourceId;
  status: SyncRunStatus;
  recordsReceived: number;
  recordsAccepted: number;
  recordsRejected: number;
  recordsInserted: number;
  recordsUpdated: number;
  errorCode: string | null;
}

/** Never logs a secret: strips any long token-shaped substring defensively,
 * even though no adapter is expected to put a secret into an error message. */
function sanitiseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]').slice(0, 500);
}

function statusForSyncRunsTable(status: SyncRunStatus): 'success' | 'partial' | 'failed' {
  if (status === 'success' || status === 'partial' || status === 'failed') return status;
  return 'failed'; // skipped_locked never reaches here; skipped_not_configured maps to failed
}

export async function runSourceSync<TUpstream, TNormalised>(
  adapter: ThreatSourceAdapter<TUpstream, TNormalised>,
  context: SyncContext,
  persist: (record: TNormalised) => Promise<'inserted' | 'updated'>
): Promise<SyncRunSummary> {
  const { db } = context;
  const owner = crypto.randomUUID();
  const now = context.now();

  const locked = await acquireLock(db, adapter.sourceId, owner, now);
  if (!locked) {
    return {
      sourceId: adapter.sourceId,
      status: 'skipped_locked',
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      errorCode: null,
    };
  }

  const syncRunId = crypto.randomUUID();
  const startedAt = now.toISOString();

  await db
    .prepare('INSERT INTO sync_runs (id, source_id, trigger_type, started_at, status) VALUES (?1,?2,?3,?4,?5)')
    .bind(syncRunId, adapter.sourceId, context.triggerType, startedAt, 'running')
    .run();

  let recordsReceived = 0;
  let recordsAccepted = 0;
  let recordsRejected = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  let errorCode: string | null = null;
  let errorMessage: string | null = null;
  let status: SyncRunStatus = 'success';

  try {
    const rawRecords = await adapter.fetchUpdates(context);
    recordsReceived = rawRecords.length;

    for (const raw of rawRecords) {
      if (!adapter.validateRecord(raw)) {
        recordsRejected += 1;
        continue;
      }
      recordsAccepted += 1;

      try {
        const normalised = await adapter.normalise(raw, context);
        if (!normalised) continue; // ineligible or insufficient data - not an error

        const outcome = await persist(normalised);
        if (outcome === 'inserted') recordsInserted += 1;
        else recordsUpdated += 1;
      } catch {
        recordsRejected += 1;
      }
    }

    if (recordsRejected > 0 && recordsAccepted > 0) {
      status = 'partial';
    }
  } catch (error) {
    if (error instanceof SourceNotConfiguredError) {
      status = 'skipped_not_configured';
      errorCode = 'not_configured';
    } else {
      status = 'failed';
      errorCode = 'fetch_or_process_error';
    }
    errorMessage = sanitiseErrorMessage(error);
  }

  const completedAt = context.now().toISOString();

  await db
    .prepare(
      `UPDATE sync_runs SET completed_at = ?1, status = ?2, records_received = ?3, records_accepted = ?4,
         records_rejected = ?5, records_inserted = ?6, records_updated = ?7, error_code = ?8, sanitised_error_message = ?9
       WHERE id = ?10`
    )
    .bind(
      completedAt,
      statusForSyncRunsTable(status),
      recordsReceived,
      recordsAccepted,
      recordsRejected,
      recordsInserted,
      recordsUpdated,
      errorCode,
      errorMessage,
      syncRunId
    )
    .run();

  await updateSourceHealth(db, adapter.sourceId, status, completedAt);
  await releaseLock(db, adapter.sourceId, owner);

  return {
    sourceId: adapter.sourceId,
    status,
    recordsReceived,
    recordsAccepted,
    recordsRejected,
    recordsInserted,
    recordsUpdated,
    errorCode,
  };
}

async function updateSourceHealth(db: D1Database, sourceId: string, status: SyncRunStatus, nowIso: string): Promise<void> {
  const isSuccess = status === 'success' || status === 'partial';

  const existing = await db
    .prepare('SELECT consecutive_failures FROM source_health WHERE source_id = ?1')
    .bind(sourceId)
    .first<{ consecutive_failures: number }>();

  const consecutiveFailures = isSuccess ? 0 : (existing?.consecutive_failures ?? 0) + 1;

  if (existing) {
    await db
      .prepare(
        `UPDATE source_health SET
           last_success_at = CASE WHEN ?1 = 1 THEN ?2 ELSE last_success_at END,
           last_failure_at = CASE WHEN ?1 = 0 THEN ?2 ELSE last_failure_at END,
           consecutive_failures = ?3,
           updated_at = ?2
         WHERE source_id = ?4`
      )
      .bind(isSuccess ? 1 : 0, nowIso, consecutiveFailures, sourceId)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO source_health (source_id, last_success_at, last_failure_at, consecutive_failures, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?2)`
      )
      .bind(sourceId, isSuccess ? nowIso : null, isSuccess ? null : nowIso, consecutiveFailures)
      .run();
  }
}
