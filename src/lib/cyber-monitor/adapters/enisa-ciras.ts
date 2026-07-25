// Romania Cyber Monitor - ENISA CIRAS adapter (aggregated EU statistics).
//
// Disabled by default (SOURCE_ENISA_CIRAS_ENABLED=false). Of all eight
// sources, this is the least verifiable from this environment: ENISA CIRAS
// is presented as an interactive dashboard rather than a documented
// stable REST API, and this sandbox has no network path to enisa.europa.eu
// to confirm a public CSV/JSON export URL and its column structure.
//
// Rather than guess a plausible-looking endpoint or column layout, this
// adapter requires an operator to explicitly supply the export URL via
// the ENISA_CIRAS_EXPORT_URL binding (and its host, matched by
// ENISA_CIRAS_EXPORT_HOST) once they've located the current official
// public export in the CIRAS dashboard. Until that's supplied, the
// adapter stays unconfigured rather than doing something that might be
// silently wrong.
//
// Every record this adapter can ever produce is a pre-aggregated metric
// (dataset/scope/period/metric name+value) - the NormalisedAggregateStatistic
// type structurally has no organisation, victim, or individual-incident
// field, so this source can never manufacture an individual incident
// record no matter what the input contains.

import { z } from 'zod';
import type { NormalisedAggregateStatistic, SyncContext, ThreatSourceAdapter } from '../types';
import { guardedFetch } from '../fetch-guard';
import { computeDedupKey } from '../dedup';
import { getRequiredSecret, isSourceEnabled, SourceNotConfiguredError } from '../source-config';

const EnisaCirasRowSchema = z
  .object({
    dataset: z.string(),
    scope: z.enum(['romania', 'eu']),
    period_label: z.string(),
    period_start: z.string(),
    period_end: z.string(),
    sector: z.string().nullable().optional(),
    metric_name: z.string(),
    metric_value: z.number(),
  })
  .passthrough();

export type EnisaCirasRow = z.infer<typeof EnisaCirasRowSchema>;

export const enisaCirasAdapter: ThreatSourceAdapter<EnisaCirasRow, NormalisedAggregateStatistic> = {
  sourceId: 'enisa_ciras',

  async fetchUpdates(context: SyncContext): Promise<EnisaCirasRow[]> {
    if (!isSourceEnabled(context.env, 'SOURCE_ENISA_CIRAS_ENABLED')) {
      throw new SourceNotConfiguredError('enisa_ciras', 'disabled');
    }

    const exportUrl = getRequiredSecret(context.env, 'ENISA_CIRAS_EXPORT_URL');
    const exportHost = getRequiredSecret(context.env, 'ENISA_CIRAS_EXPORT_HOST');
    if (!exportUrl || !exportHost) {
      throw new SourceNotConfiguredError('enisa_ciras', 'missing_export_url');
    }

    const result = await guardedFetch(exportUrl, {
      allowedHosts: [exportHost],
      headers: { Accept: 'application/json' },
    });

    if (!result.ok || !result.body) {
      throw new Error(`enisa_ciras_fetch_failed:${result.error ?? result.status ?? 'unknown'}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.body);
    } catch {
      throw new Error('enisa_ciras_invalid_json');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('enisa_ciras_unexpected_shape:not_an_array');
    }

    return parsed as EnisaCirasRow[];
  },

  validateRecord(record): record is EnisaCirasRow {
    return EnisaCirasRowSchema.safeParse(record).success;
  },

  async normalise(row): Promise<NormalisedAggregateStatistic | null> {
    const dedupKey = await computeDedupKey([
      'enisa_ciras',
      row.dataset,
      row.scope,
      row.period_label,
      row.sector,
      row.metric_name,
    ]);

    return {
      dataset: row.dataset,
      scope: row.scope,
      periodLabel: row.period_label,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      sector: row.sector ?? null,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      dedupKey,
    };
  },
};
