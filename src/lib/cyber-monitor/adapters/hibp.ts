// Romania Cyber Monitor - Have I Been Pwned breach catalogue adapter.
//
// Uses only the free, public breach metadata catalogue - no API key, no
// email/domain search, no storage of exposed account data. Romania
// eligibility depends entirely on matching `Domain` against the curated,
// manually verified organisation_domains registry (see migrations/0002).
// A bare .ro domain with no verified organisation match is NOT eligible
// for automatic publication - it is intentionally left out of the pipeline
// here; a separate editorial review-queue step (not yet built) is
// responsible for surfacing "medium confidence" candidates like that.
//
// LIMITATION: this sandbox has no network path to haveibeenpwned.com, so
// the schema below is built from HIBP's publicly documented API v3 shape
// rather than a live-verified response. Verify before enabling in
// production (SOURCE_HIBP_ENABLED).

import { z } from 'zod';
import type { NormalisedIncident, SyncContext, ThreatSourceAdapter } from '../types';
import { guardedFetch } from '../fetch-guard';
import { computeDedupKey } from '../dedup';
import { evaluateRomaniaEligibility } from '../eligibility';
import { sanitizeUpstreamHtml } from '../sanitize';
import { slugify } from '../slugify';

export const HIBP_HOST = 'haveibeenpwned.com';
export const HIBP_BREACHES_ENDPOINT = 'https://haveibeenpwned.com/api/v3/breaches';

const HIBP_USER_AGENT =
  'RomaniaCyberMonitor/1.0 (+https://liviubucel.com/romania-cyber-monitor; contact@liviubucel.com)';

const HibpBreachSchema = z
  .object({
    Name: z.string(),
    Title: z.string(),
    Domain: z.string().optional().default(''),
    BreachDate: z.string(),
    AddedDate: z.string(),
    ModifiedDate: z.string(),
    PwnCount: z.number().optional().default(0),
    Description: z.string().optional().default(''),
    DataClasses: z.array(z.string()).optional().default([]),
    IsVerified: z.boolean().optional().default(false),
    IsFabricated: z.boolean().optional().default(false),
    IsSensitive: z.boolean().optional().default(false),
    IsRetired: z.boolean().optional().default(false),
    IsSpamList: z.boolean().optional().default(false),
  })
  .passthrough();

export type HibpBreach = z.infer<typeof HibpBreachSchema>;

async function findVerifiedOrganisationDomainMatch(
  db: D1Database,
  domain: string
): Promise<string | null> {
  if (!domain) return null;
  const row = await db
    .prepare('SELECT organisation_id FROM organisation_domains WHERE domain = ?1 AND verified = 1')
    .bind(domain.toLowerCase())
    .first<{ organisation_id: string }>();
  return row?.organisation_id ?? null;
}

function buildBreachSummary(record: HibpBreach, sanitisedDescription: string): string {
  const verificationNote = record.IsVerified
    ? 'This breach is marked as verified within the Have I Been Pwned catalogue.'
    : 'This breach is marked as unverified within the Have I Been Pwned catalogue and has not been independently corroborated.';
  const description = sanitisedDescription.trim();
  return [
    `${record.Title} was added to the Have I Been Pwned breach catalogue on ${record.AddedDate}, with an alleged breach date of ${record.BreachDate}.`,
    verificationNote,
    'This verification reflects Have I Been Pwned’s own catalogue process, not confirmation by a Romanian authority.',
    description,
  ]
    .filter(Boolean)
    .join(' ');
}

export const hibpAdapter: ThreatSourceAdapter<HibpBreach, NormalisedIncident> = {
  sourceId: 'hibp',

  async fetchUpdates(): Promise<HibpBreach[]> {
    const result = await guardedFetch(HIBP_BREACHES_ENDPOINT, {
      allowedHosts: [HIBP_HOST],
      headers: {
        'User-Agent': HIBP_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!result.ok || !result.body) {
      throw new Error(`hibp_fetch_failed:${result.error ?? result.status ?? 'unknown'}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.body);
    } catch {
      throw new Error('hibp_invalid_json');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('hibp_unexpected_shape:not_an_array');
    }

    return parsed as HibpBreach[];
  },

  validateRecord(record): record is HibpBreach {
    return HibpBreachSchema.safeParse(record).success;
  },

  async normalise(record, context?: SyncContext): Promise<NormalisedIncident | null> {
    if (!context?.db) {
      throw new Error('hibp_adapter_requires_db_context');
    }

    const domain = (record.Domain ?? '').toLowerCase();
    const organisationId = await findVerifiedOrganisationDomainMatch(context.db, domain);

    const eligibility = evaluateRomaniaEligibility(
      { verifiedOrganisationDomainMatch: Boolean(organisationId) },
      { domainTld: domain.endsWith('.ro') ? '.ro' : null }
    );

    if (!eligibility.eligible || !eligibility.basis) {
      return null;
    }

    const sanitisedDescription = sanitizeUpstreamHtml(record.Description ?? '');
    const dedupKey = await computeDedupKey(['hibp', record.Name]);

    return {
      slug: `${slugify(record.Title)}-${dedupKey.slice(0, 8)}`,
      recordType: 'verified_breach',
      organisationId,
      organisationDisplayName: record.Title,
      threatGroupId: null,
      countryCode: 'RO',
      romaniaRelationshipBasis: eligibility.basis,
      countryConfidence: eligibility.confidence,
      incidentDate: record.BreachDate,
      discoveredDate: record.AddedDate,
      firstObserved: record.AddedDate,
      lastObserved: record.ModifiedDate,
      verificationStatus: record.IsVerified ? 'source_verified' : 'unverified_claim',
      // Per operator decision: any record that reaches this point has
      // already passed the high-confidence Romania eligibility gate (a
      // verified organisation-domain match), so it publishes immediately
      // without a manual editorial step.
      editorialStatus: 'published',
      summary: buildBreachSummary(record, sanitisedDescription),
      sector: null,
      independentlyConfirmed: false,
      dedupKey,
      source: {
        sourceId: 'hibp',
        upstreamRecordId: record.Name,
        sourceUrl: 'https://haveibeenpwned.com/PwnedWebsites',
        title: record.Title,
        sourcePublicationDate: record.BreachDate,
        payloadHash: dedupKey,
        authoritative: false,
        corroboratesClaim: false,
        sanitisedMetadata: {
          domain: record.Domain,
          pwnCount: record.PwnCount,
          dataClasses: record.DataClasses,
          isVerified: record.IsVerified,
          isFabricated: record.IsFabricated,
          isSensitive: record.IsSensitive,
          isRetired: record.IsRetired,
          isSpamList: record.IsSpamList,
        },
      },
    };
  },
};
