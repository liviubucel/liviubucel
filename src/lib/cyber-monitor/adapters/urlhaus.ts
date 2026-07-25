// Romania Cyber Monitor - URLhaus (abuse.ch) adapter.
//
// Disabled by default (SOURCE_URLHAUS_ENABLED=false) pending an abuse.ch
// Auth-Key. Read-only, bounded recent queries only. Every URL is defanged
// before it leaves normalise() - this adapter must never produce a
// clickable hyperlink to malware-distribution infrastructure.
//
// LIMITATION: this sandbox has no network path to urlhaus-api.abuse.ch.
// The schema reflects the publicly documented URLhaus v1 "recent URLs"
// response shape. Verify against https://urlhaus.abuse.ch/api/ before
// enabling in production.

import { z } from 'zod';
import type { NormalisedIndicator, SyncContext, ThreatSourceAdapter } from '../types';
import { guardedFetch } from '../fetch-guard';
import { computeDedupKey } from '../dedup';
import { defangUrl } from '../defang';
import { evaluateRomaniaEligibility } from '../eligibility';
import { getRequiredSecret, isSourceEnabled, SourceNotConfiguredError } from '../source-config';

export const URLHAUS_HOST = 'urlhaus-api.abuse.ch';
export const URLHAUS_RECENT_ENDPOINT = 'https://urlhaus-api.abuse.ch/v1/urls/recent/';

const UrlhausEntrySchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    url: z.string(),
    url_status: z.string().optional(),
    threat: z.string().optional(),
    tags: z.array(z.string()).nullable().optional(),
    date_added: z.string().optional(),
    urlhaus_reference: z.string().nullable().optional(),
  })
  .passthrough();

export type UrlhausEntry = z.infer<typeof UrlhausEntrySchema>;

export const urlhausAdapter: ThreatSourceAdapter<UrlhausEntry, NormalisedIndicator> = {
  sourceId: 'urlhaus',

  async fetchUpdates(context: SyncContext): Promise<UrlhausEntry[]> {
    if (!isSourceEnabled(context.env, 'SOURCE_URLHAUS_ENABLED')) {
      throw new SourceNotConfiguredError('urlhaus', 'disabled');
    }

    const authKey = getRequiredSecret(context.env, 'ABUSECH_AUTH_KEY');
    if (!authKey) {
      throw new SourceNotConfiguredError('urlhaus', 'missing_auth_key');
    }

    const result = await guardedFetch(URLHAUS_RECENT_ENDPOINT, {
      allowedHosts: [URLHAUS_HOST],
      method: 'POST',
      headers: { 'Auth-Key': authKey },
    });

    if (!result.ok || !result.body) {
      throw new Error(`urlhaus_fetch_failed:${result.error ?? result.status ?? 'unknown'}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.body);
    } catch {
      throw new Error('urlhaus_invalid_json');
    }

    const urls = (parsed as { urls?: unknown })?.urls;
    if (!Array.isArray(urls)) {
      throw new Error('urlhaus_unexpected_shape:missing_urls_array');
    }

    return urls as UrlhausEntry[];
  },

  validateRecord(record): record is UrlhausEntry {
    return UrlhausEntrySchema.safeParse(record).success;
  },

  async normalise(entry): Promise<NormalisedIndicator | null> {
    // URLhaus has no country field. Without a verified correlation to a
    // Romanian organisation/domain/ASN (a later pipeline stage), this stays
    // "low" confidence and is never published from this adapter alone.
    const eligibility = evaluateRomaniaEligibility({});

    const dedupKey = await computeDedupKey(['urlhaus', String(entry.id)]);

    return {
      iocType: 'url',
      defangedValue: defangUrl(entry.url),
      malwareFamily: null,
      threatType: entry.threat ?? null,
      firstSeen: entry.date_added ?? null,
      lastSeen: null,
      active: entry.url_status !== 'offline',
      romaniaRelationshipBasis: eligibility.eligible ? eligibility.basis : null,
      countryConfidence: eligibility.confidence,
      dedupKey,
    };
  },
};
