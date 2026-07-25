// Romania Cyber Monitor - shared domain types.
// These types intentionally keep record type, verification status and
// editorial status as three separate axes (see docs/romania-cyber-monitor.md).

export type RomaniaRelationshipBasis =
  | 'source_country_ro'
  | 'verified_romanian_organisation'
  | 'verified_organisation_domain'
  | 'verified_romanian_asn'
  | 'official_source'
  | 'manual_editorial_confirmation';

export type CountryConfidence = 'high' | 'medium' | 'low';

export type RecordType =
  | 'ransomware_claim'
  | 'verified_breach'
  | 'public_exposure'
  | 'threat_indicator'
  | 'malware_distribution'
  | 'malware_intelligence'
  | 'aggregate_statistics';

export type VerificationStatus =
  | 'unverified_claim'
  | 'source_verified'
  | 'media_corroborated'
  | 'organisation_confirmed'
  | 'authority_confirmed'
  | 'disputed'
  | 'false_positive';

export type EditorialStatus =
  | 'candidate'
  | 'needs_review'
  | 'draft'
  | 'approved'
  | 'published'
  | 'updated'
  | 'retracted'
  | 'archived';

export type ArticleType =
  | 'incident_brief'
  | 'verified_breach_profile'
  | 'weekly_report'
  | 'monthly_report'
  | 'threat_group_profile'
  | 'sector_analysis'
  | 'technical_explainer'
  | 'methodology_update';

export type ArticleStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'retracted';

export type SourceId =
  | 'ransomware_live'
  | 'hibp'
  | 'leakix'
  | 'threatfox'
  | 'urlhaus'
  | 'malwarebazaar'
  | 'misp'
  | 'enisa_ciras';

export interface SyncContext {
  db: D1Database;
  env: Record<string, unknown>;
  now: () => Date;
  triggerType: 'cron' | 'manual';
}

/**
 * Every source adapter implements this interface. Validation and
 * normalisation are separate steps so an invalid upstream record can be
 * rejected before any normalisation logic runs.
 */
export interface ThreatSourceAdapter<TUpstream, TNormalised> {
  sourceId: SourceId;
  fetchUpdates(context: SyncContext): Promise<TUpstream[]>;
  validateRecord(record: unknown): record is TUpstream;
  normalise(record: TUpstream, context: SyncContext): Promise<TNormalised | null>;
}

export interface NormalisedIncident {
  slug: string;
  recordType: RecordType;
  organisationId: string | null;
  organisationDisplayName: string | null;
  threatGroupId: string | null;
  countryCode: string;
  romaniaRelationshipBasis: RomaniaRelationshipBasis;
  countryConfidence: CountryConfidence;
  incidentDate: string | null;
  discoveredDate: string | null;
  firstObserved: string | null;
  lastObserved: string | null;
  verificationStatus: VerificationStatus;
  editorialStatus: EditorialStatus;
  summary: string | null;
  sector: string | null;
  independentlyConfirmed: boolean;
  dedupKey: string;
  source: {
    sourceId: SourceId;
    upstreamRecordId: string;
    sourceUrl: string | null;
    title: string | null;
    sourcePublicationDate: string | null;
    payloadHash: string;
    authoritative: boolean;
    corroboratesClaim: boolean;
    sanitisedMetadata: Record<string, unknown>;
  };
}
