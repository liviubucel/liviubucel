// Romania Cyber Monitor - ThreatFox (abuse.ch) adapter.
//
// Disabled by default (SOURCE_THREATFOX_ENABLED=false) pending an abuse.ch
// Auth-Key. Read-only: this adapter never submits IOCs. Every value is
// defanged before it leaves normalise() - nothing here should ever be
// clickable or resolvable from a public response.
//
// LIMITATION: this sandbox has no network path to threatfox-api.abuse.ch.
// The schema reflects the publicly documented ThreatFox v1 "get_iocs"
// response shape. Verify against https://threatfox.abuse.ch/api/ before
// enabling in production.

import { z } from 'zod';
import type { NormalisedIndicator, SyncContext, ThreatSourceAdapter } from '../types';
import { guardedFetch } from '../fetch-guard';
import { computeDedupKey } from '../dedup';
import { defangDomain, defangIp, defangUrl } from '../defang';
import { evaluateRomaniaEligibility } from '../eligibility';
import { getRequiredSecret, isSourceEnabled, SourceNotConfiguredError } from '../source-config';

export const THREATFOX_HOST = 'threatfox-api.abuse.ch';
export const THREATFOX_ENDPOINT = 'https://threatfox-api.abuse.ch/api/v1/';

/** Bounded recent window, per the "no unbounded historical dataset" requirement. */
export const THREATFOX_RECENT_DAYS = 3;

const ThreatFoxIocSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    ioc: z.string(),
    ioc_type: z.string(),
    threat_type: z.string().optional(),
    malware: z.string().optional(),
    malware_printable: z.string().optional(),
    confidence_level: z.number().optional(),
    first_seen: z.string().optional(),
    last_seen: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    reference: z.string().nullable().optional(),
  })
  .passthrough();

export type ThreatFoxIoc = z.infer<typeof ThreatFoxIocSchema>;

function defangIndicatorValue(ioc: string, iocType: string): string {
  if (iocType.includes('url')) return defangUrl(ioc);
  if (iocType.includes('ip')) return defangIp(ioc);
  return defangDomain(ioc);
}

export const threatfoxAdapter: ThreatSourceAdapter<ThreatFoxIoc, NormalisedIndicator> = {
  sourceId: 'threatfox',

  async fetchUpdates(context: SyncContext): Promise<ThreatFoxIoc[]> {
    if (!isSourceEnabled(context.env, 'SOURCE_THREATFOX_ENABLED')) {
      throw new SourceNotConfiguredError('threatfox', 'disabled');
    }

    const authKey = getRequiredSecret(context.env, 'ABUSECH_AUTH_KEY');
    if (!authKey) {
      throw new SourceNotConfiguredError('threatfox', 'missing_auth_key');
    }

    const result = await guardedFetch(THREATFOX_ENDPOINT, {
      allowedHosts: [THREATFOX_HOST],
      method: 'POST',
      headers: {
        'Auth-Key': authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'get_iocs', days: THREATFOX_RECENT_DAYS }),
    });

    if (!result.ok || !result.body) {
      throw new Error(`threatfox_fetch_failed:${result.error ?? result.status ?? 'unknown'}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.body);
    } catch {
      throw new Error('threatfox_invalid_json');
    }

    const data = (parsed as { data?: unknown })?.data;
    if (!Array.isArray(data)) {
      throw new Error('threatfox_unexpected_shape:missing_data_array');
    }

    return data as ThreatFoxIoc[];
  },

  validateRecord(record): record is ThreatFoxIoc {
    return ThreatFoxIocSchema.safeParse(record).success;
  },

  async normalise(ioc): Promise<NormalisedIndicator | null> {
    // ThreatFox has no country field at all - Romania eligibility here can
    // only come from a verified organisation/domain/ASN match established
    // by a separate correlation step (not yet built), or a manual editorial
    // confirmation. Absent that, every IOC stays "low" confidence and is
    // never published from this adapter alone.
    const eligibility = evaluateRomaniaEligibility({});

    const isActive = !ioc.last_seen; // ThreatFox omits last_seen for still-active IOCs
    const defangedValue = defangIndicatorValue(ioc.ioc, ioc.ioc_type);
    const dedupKey = await computeDedupKey(['threatfox', String(ioc.id)]);

    return {
      iocType: ioc.ioc_type,
      defangedValue,
      malwareFamily: ioc.malware_printable ?? ioc.malware ?? null,
      threatType: ioc.threat_type ?? null,
      firstSeen: ioc.first_seen ?? null,
      lastSeen: ioc.last_seen ?? null,
      active: isActive,
      romaniaRelationshipBasis: eligibility.eligible ? eligibility.basis : null,
      countryConfidence: eligibility.confidence,
      dedupKey,
    };
  },
};
