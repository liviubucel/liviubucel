// Romania Cyber Monitor - Ransomware.live adapter.
//
// IMPORTANT LIMITATION: this adapter's response schema is built from the
// best publicly documented shape of the Ransomware.live v2
// "countryvictims" endpoint. This development sandbox has no network path
// to api.ransomware.live (outbound requests to third-party hosts are
// blocked by the environment's egress policy), so the exact live response
// could not be confirmed at implementation time. The schema below is
// therefore intentionally defensive: every field is optional with common
// name variants, and any record that fails validation is rejected rather
// than guessed at. Before enabling this source in production
// (SOURCE_RANSOMWARE_LIVE_ENABLED), verify the schema against
// https://api.ransomware.live/docs with a real request and adjust the
// field names below if they differ.

import { z } from 'zod';
import type { NormalisedIncident, SyncContext, ThreatSourceAdapter } from '../types';
import { guardedFetch } from '../fetch-guard';
import { computeDedupKey } from '../dedup';
import { evaluateRomaniaEligibility } from '../eligibility';
import { slugify } from '../slugify';

export const RANSOMWARE_LIVE_HOST = 'api.ransomware.live';
export const RANSOMWARE_LIVE_RO_ENDPOINT = 'https://api.ransomware.live/v2/countryvictims/RO';

const RansomwareLiveVictimSchema = z
  .object({
    victim: z.string().optional(),
    post_title: z.string().optional(),
    victim_name: z.string().optional(),
    group_name: z.string().optional(),
    group: z.string().optional(),
    country: z.string().optional(),
    discovered: z.string().optional(),
    published: z.string().optional(),
    attackdate: z.string().nullable().optional(),
    activity: z.string().optional(),
    sector: z.string().optional(),
  })
  .passthrough();

export type RansomwareLiveVictim = z.infer<typeof RansomwareLiveVictimSchema>;

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value && value.trim().length > 0) return value.trim();
  }
  return null;
}

function buildRansomwareClaimSummary(organisation: string, group: string, discoveredDate: string | null): string {
  const dateFragment = discoveredDate ? `on ${discoveredDate}` : 'on an undated entry';
  return (
    `${group} listed ${organisation} on a data-leak site monitored by public ransomware ` +
    `intelligence sources ${dateFragment}. This entry records a public claim made by a ` +
    `ransomware group. It does not by itself prove that the organisation was compromised or ` +
    `that the threat actor's statements are accurate. At the time of writing, the claim has ` +
    `not been independently confirmed by the organisation, DNSC, another Romanian authority, ` +
    `or another authoritative source.`
  );
}

export const ransomwareLiveAdapter: ThreatSourceAdapter<RansomwareLiveVictim, NormalisedIncident> = {
  sourceId: 'ransomware_live',

  async fetchUpdates(): Promise<RansomwareLiveVictim[]> {
    const result = await guardedFetch(RANSOMWARE_LIVE_RO_ENDPOINT, {
      allowedHosts: [RANSOMWARE_LIVE_HOST],
      headers: {
        'User-Agent': 'RomaniaCyberMonitor/1.0 (+https://liviubucel.com/romania-cyber-monitor)',
        Accept: 'application/json',
      },
    });

    if (!result.ok || !result.body) {
      throw new Error(`ransomware_live_fetch_failed:${result.error ?? result.status ?? 'unknown'}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.body);
    } catch {
      throw new Error('ransomware_live_invalid_json');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('ransomware_live_unexpected_shape:not_an_array');
    }

    return parsed as RansomwareLiveVictim[];
  },

  validateRecord(record): record is RansomwareLiveVictim {
    return RansomwareLiveVictimSchema.safeParse(record).success;
  },

  async normalise(record): Promise<NormalisedIncident | null> {
    const organisationName = firstNonEmpty(record.victim, record.post_title, record.victim_name);
    const threatGroup = firstNonEmpty(record.group_name, record.group);

    if (!organisationName || !threatGroup) {
      return null;
    }

    // The endpoint is already scoped to /countryvictims/RO, but we never
    // trust upstream filtering blindly - re-run the eligibility engine
    // explicitly. If the upstream `country` field is present and disagrees
    // with RO, this correctly falls through to "not eligible".
    const eligibility = evaluateRomaniaEligibility({
      sourceCountryCode: record.country ?? 'RO',
    });

    if (!eligibility.eligible || !eligibility.basis) {
      return null;
    }

    const discoveredDate = firstNonEmpty(record.discovered, record.published);
    const dedupKey = await computeDedupKey(['ransomware_live', organisationName, threatGroup, discoveredDate]);
    const slug = `${slugify(organisationName)}-${slugify(threatGroup)}-${dedupKey.slice(0, 8)}`;

    return {
      slug,
      recordType: 'ransomware_claim',
      organisationId: null,
      organisationDisplayName: organisationName,
      threatGroupId: slugify(threatGroup),
      countryCode: 'RO',
      romaniaRelationshipBasis: eligibility.basis,
      countryConfidence: eligibility.confidence,
      incidentDate: record.attackdate ?? null,
      discoveredDate,
      firstObserved: discoveredDate,
      lastObserved: discoveredDate,
      verificationStatus: 'unverified_claim',
      // Per operator decision: any record that reaches this point has
      // already passed the high-confidence Romania eligibility gate, and
      // uses only templated, careful "claim, not confirmed" wording - so
      // it publishes immediately without a manual editorial step.
      editorialStatus: 'published',
      summary: buildRansomwareClaimSummary(organisationName, threatGroup, discoveredDate),
      sector: firstNonEmpty(record.sector, record.activity),
      independentlyConfirmed: false,
      dedupKey,
      source: {
        sourceId: 'ransomware_live',
        upstreamRecordId: dedupKey,
        // Never expose or store the leak-site URL - see project security policy.
        sourceUrl: null,
        title: `${organisationName} listed by ${threatGroup}`,
        sourcePublicationDate: discoveredDate,
        payloadHash: dedupKey,
        authoritative: false,
        corroboratesClaim: true,
        sanitisedMetadata: {
          sector: firstNonEmpty(record.sector, record.activity),
        },
      },
    };
  },
};
