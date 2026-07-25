// Romania Cyber Monitor - top-level scheduled-event orchestration.
// Dispatches every source due for the firing cron expression, in parallel
// isolation (one source's failure/lock contention never affects another).

import type { NormalisedIncident, SourceId, SyncContext } from './types';
import { ADAPTER_REGISTRY } from './adapters/registry';
import { runSourceSync, type SyncRunSummary } from './sync-runner';
import {
  persistAggregateStatistic,
  persistExposure,
  persistIncident,
  persistIndicator,
  persistMalwareMetadata,
} from './persist';
import { generateIncidentArticle, persistGeneratedArticle } from './article-generation';

/** Persists an incident and, per operator decision, immediately generates
 * and publishes a blog article for any newly published incident - no
 * separate editorial approval step. Returns just the outcome string so it
 * satisfies runSourceSync's generic persist() callback shape. */
async function persistIncidentAndPublishArticle(
  context: SyncContext,
  record: NormalisedIncident
): Promise<'inserted' | 'updated'> {
  const nowIso = context.now().toISOString();
  const result = await persistIncident(context.db, record, nowIso);

  if (result.newlyPublished) {
    const article = generateIncidentArticle(record);
    if (article) {
      await persistGeneratedArticle(context.db, article, result.id, nowIso);
    }
  }

  return result.outcome;
}

// LeakIX must remain sequential and rate-limited even relative to other
// sources - it is never run concurrently with anything else that also
// hits leakix.net, which in this registry is nothing else, so this is
// naturally satisfied. Everything else may run concurrently; each source
// has its own D1 lock and its own outbound host, so concurrency here does
// not create cross-source rate-limit contention.
const SEQUENTIAL_SOURCES = new Set<SourceId>(['leakix']);

async function runOneSource(sourceId: SourceId, context: SyncContext): Promise<SyncRunSummary> {
  const adapter = ADAPTER_REGISTRY[sourceId];

  switch (sourceId) {
    case 'ransomware_live':
    case 'hibp':
      return runSourceSync(adapter, context, (record) => persistIncidentAndPublishArticle(context, record));
    case 'leakix':
      return runSourceSync(adapter, context, (record) => persistExposure(context.db, record, context.now().toISOString()));
    case 'threatfox':
    case 'urlhaus':
    case 'misp':
      return runSourceSync(adapter, context, (record) => persistIndicator(context.db, record, context.now().toISOString()));
    case 'malwarebazaar':
      return runSourceSync(adapter, context, (record) => persistMalwareMetadata(context.db, record, context.now().toISOString()));
    case 'enisa_ciras':
      return runSourceSync(adapter, context, (record) => persistAggregateStatistic(context.db, record, sourceId));
    default: {
      const exhaustiveCheck: never = sourceId;
      throw new Error(`unhandled_source_id:${exhaustiveCheck}`);
    }
  }
}

export interface ScheduledRunResult {
  cron: string;
  results: SyncRunSummary[];
}

export async function runScheduledSources(
  sourceIds: SourceId[],
  db: D1Database,
  env: Record<string, unknown>,
  now: () => Date,
  cron: string
): Promise<ScheduledRunResult> {
  const context: SyncContext = { db, env, now, triggerType: 'cron' };

  const sequential = sourceIds.filter((id) => SEQUENTIAL_SOURCES.has(id));
  const concurrent = sourceIds.filter((id) => !SEQUENTIAL_SOURCES.has(id));

  const concurrentResults = await Promise.allSettled(concurrent.map((id) => runOneSource(id, context)));

  const sequentialResults: SyncRunSummary[] = [];
  for (const id of sequential) {
    // eslint-disable-next-line no-await-in-loop
    sequentialResults.push(await runOneSource(id, context));
  }

  const results: SyncRunSummary[] = [
    ...concurrentResults.map((outcome, index) =>
      outcome.status === 'fulfilled'
        ? outcome.value
        : ({
            sourceId: concurrent[index],
            status: 'failed' as const,
            recordsReceived: 0,
            recordsAccepted: 0,
            recordsRejected: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errorCode: 'unhandled_promise_rejection',
          } satisfies SyncRunSummary)
    ),
    ...sequentialResults,
  ];

  return { cron, results };
}
