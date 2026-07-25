// Romania Cyber Monitor - LeakIX adapter (public exposure data).
//
// Disabled by default (SOURCE_LEAKIX_ENABLED=false) pending a paid LeakIX
// API key. This adapter is read-only, aggregated, and redacted by design:
// it never connects to an exposed target, never fetches a flagged file,
// and never stores enough detail to reconstruct who/what was exposed.
//
// LIMITATION: this sandbox has no network path to leakix.net, and the
// exact search-query syntax/response shape could not be confirmed live.
// The schema below reflects LeakIX's publicly documented event shape
// (geoip.country_iso_code, host, port, protocol, plugin/tags, network/asn).
// Verify against the current LeakIX API docs before enabling in production.

import { z } from 'zod';
import type { NormalisedExposure, SyncContext, ThreatSourceAdapter } from '../types';
import { guardedFetch } from '../fetch-guard';
import { computeDedupKey } from '../dedup';
import { maskIpv4 } from '../defang';
import { getRequiredSecret, isSourceEnabled, SourceNotConfiguredError } from '../source-config';

export const LEAKIX_HOST = 'leakix.net';
export const LEAKIX_SEARCH_ENDPOINT = 'https://leakix.net/search?scope=leak&q=+geoip.country_iso_code:RO';

const LeakIxEventSchema = z
  .object({
    ip: z.string().optional(),
    host: z.string().optional(),
    port: z.number().optional(),
    protocol: z.string().optional(),
    event_type: z.string().optional(),
    event_severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
    time: z.string().optional(),
    geoip: z
      .object({
        country_iso_code: z.string().optional(),
      })
      .optional(),
    network: z
      .object({
        organization_name: z.string().optional(),
        autonomous_system_number: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

export type LeakIxEvent = z.infer<typeof LeakIxEventSchema>;

function severityFromEvent(event: LeakIxEvent): NormalisedExposure['severity'] {
  if (event.event_severity === 'critical') return 'critical';
  if (event.event_severity === 'high') return 'high';
  if (event.event_severity === 'medium') return 'medium';
  if (event.event_severity === 'low' || event.event_severity === 'info') return 'low';
  return null;
}

function monthFromTimestamp(timestamp: string | undefined, fallback: Date): string {
  const parsed = timestamp ? new Date(timestamp) : fallback;
  const date = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const leakixAdapter: ThreatSourceAdapter<LeakIxEvent, NormalisedExposure> = {
  sourceId: 'leakix',

  async fetchUpdates(context: SyncContext): Promise<LeakIxEvent[]> {
    if (!isSourceEnabled(context.env, 'SOURCE_LEAKIX_ENABLED')) {
      throw new SourceNotConfiguredError('leakix', 'disabled');
    }

    const apiKey = getRequiredSecret(context.env, 'LEAKIX_API_KEY');
    if (!apiKey) {
      throw new SourceNotConfiguredError('leakix', 'missing_api_key');
    }

    const result = await guardedFetch(LEAKIX_SEARCH_ENDPOINT, {
      allowedHosts: [LEAKIX_HOST],
      headers: { 'api-key': apiKey, Accept: 'application/json' },
      // LeakIX documents a strict rate limit; stay well under ~1 req/sec
      // and keep the retry budget small.
      maxRetries: 2,
    });

    if (!result.ok || !result.body) {
      throw new Error(`leakix_fetch_failed:${result.error ?? result.status ?? 'unknown'}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.body);
    } catch {
      throw new Error('leakix_invalid_json');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('leakix_unexpected_shape:not_an_array');
    }

    return parsed as LeakIxEvent[];
  },

  validateRecord(record): record is LeakIxEvent {
    return LeakIxEventSchema.safeParse(record).success;
  },

  async normalise(event, context?: SyncContext): Promise<NormalisedExposure | null> {
    if (event.geoip?.country_iso_code?.toUpperCase() !== 'RO') {
      return null;
    }

    const now = context?.now?.() ?? new Date();
    const observedMonth = monthFromTimestamp(event.time, now);
    const dedupKey = await computeDedupKey([
      'leakix',
      event.host,
      event.port?.toString(),
      event.protocol,
      observedMonth,
    ]);

    return {
      exposureType: event.event_type ?? 'unknown_exposure',
      severity: severityFromEvent(event),
      affectedServiceType: event.protocol ?? null,
      hostingAsn: event.network?.autonomous_system_number ?? null,
      hostingOrganisation: event.network?.organization_name ?? null,
      countryIsoCode: 'RO',
      // Sector is never inferred from LeakIX data alone - only an editor
      // linking this exposure to a verified organisation can set it, which
      // happens in a later pipeline stage, not in this adapter.
      sector: null,
      observedMonth,
      // Full IPv4 is masked to its first octet; IPv6 is never surfaced at all.
      maskedIp: event.ip && !event.ip.includes(':') ? maskIpv4(event.ip) : null,
      dedupKey,
    };
  },
};
