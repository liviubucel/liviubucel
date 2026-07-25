// Romania Cyber Monitor - MISP public feed adapter (OSINT enrichment).
//
// Disabled by default (SOURCE_MISP_ENABLED=false) AND pending a curated
// feed list (misp-feeds.config.ts is empty until an operator adds
// reviewed feeds). Feeds are fetched independently - one feed failing
// never blocks the others. Binary attachments, malware samples, and
// personal-data attribute categories are always dropped, never ingested.

import { z } from 'zod';
import type { NormalisedIndicator, SyncContext, ThreatSourceAdapter } from '../types';
import { guardedFetch } from '../fetch-guard';
import { computeDedupKey } from '../dedup';
import { defangDomain, defangIp, defangUrl } from '../defang';
import { evaluateRomaniaEligibility } from '../eligibility';
import { isSourceEnabled, SourceNotConfiguredError } from '../source-config';
import { MISP_CURATED_FEEDS } from './misp-feeds.config';

const MISP_MAX_FEED_BYTES = 2 * 1024 * 1024; // 2 MB - reject oversized/unbounded feeds
const MISP_FEED_TIMEOUT_MS = 8_000;

/** Attribute types that carry binary content or personal data - never ingested. */
const IGNORED_ATTRIBUTE_TYPES = new Set([
  'malware-sample',
  'attachment',
  'email-src',
  'email-dst',
  'target-email',
  'person',
  'target-user',
]);

const MispAttributeSchema = z
  .object({
    type: z.string(),
    value: z.string(),
    category: z.string().optional(),
    to_ids: z.boolean().optional(),
    event_info: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

export type MispAttribute = z.infer<typeof MispAttributeSchema>;

function defangByType(value: string, type: string): string {
  if (type.includes('url')) return defangUrl(value);
  if (type.includes('ip')) return defangIp(value);
  if (type.includes('domain') || type.includes('hostname')) return defangDomain(value);
  return value;
}

export const mispAdapter: ThreatSourceAdapter<MispAttribute, NormalisedIndicator> = {
  sourceId: 'misp',

  async fetchUpdates(context: SyncContext): Promise<MispAttribute[]> {
    if (!isSourceEnabled(context.env, 'SOURCE_MISP_ENABLED')) {
      throw new SourceNotConfiguredError('misp', 'disabled');
    }

    if (MISP_CURATED_FEEDS.length === 0) {
      throw new SourceNotConfiguredError('misp', 'no_curated_feeds_configured');
    }

    const allowedHosts = MISP_CURATED_FEEDS.map((feed) => feed.host);
    const collected: MispAttribute[] = [];

    for (const feed of MISP_CURATED_FEEDS) {
      const result = await guardedFetch(feed.url, {
        allowedHosts,
        maxResponseBytes: MISP_MAX_FEED_BYTES,
        timeoutMs: MISP_FEED_TIMEOUT_MS,
        maxRetries: 1,
      });

      // A single feed failing (timeout, oversize, non-200) must never
      // block the other curated feeds from being processed.
      if (!result.ok || !result.body) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(result.body);
      } catch {
        continue;
      }

      if (Array.isArray(parsed)) {
        collected.push(...(parsed as MispAttribute[]));
      }
    }

    return collected;
  },

  validateRecord(record): record is MispAttribute {
    return MispAttributeSchema.safeParse(record).success;
  },

  async normalise(attribute): Promise<NormalisedIndicator | null> {
    if (IGNORED_ATTRIBUTE_TYPES.has(attribute.type)) {
      return null;
    }

    const eligibility = evaluateRomaniaEligibility({});
    const dedupKey = await computeDedupKey(['misp', attribute.type, attribute.value]);

    return {
      iocType: attribute.type,
      defangedValue: defangByType(attribute.value, attribute.type),
      malwareFamily: null,
      threatType: attribute.category ?? null,
      firstSeen: attribute.timestamp ?? null,
      lastSeen: null,
      active: true,
      romaniaRelationshipBasis: eligibility.eligible ? eligibility.basis : null,
      countryConfidence: eligibility.confidence,
      dedupKey,
    };
  },
};
