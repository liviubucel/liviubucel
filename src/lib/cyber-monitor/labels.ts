// Romania Cyber Monitor - shared display labels and section routing for the
// public-facing pages. Kept separate from the domain types so wording
// changes never touch ingestion/eligibility logic.

import type { RecordType } from './types';

export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  ransomware_claim: 'Ransomware claim',
  verified_breach: 'Verified breach',
  public_exposure: 'Public exposure',
  threat_indicator: 'Threat indicator',
  malware_distribution: 'Malware distribution',
  malware_intelligence: 'Malware intelligence',
  aggregate_statistics: 'Aggregate statistics',
};

export const RECORD_TYPE_SECTION_PATH: Partial<Record<RecordType, string>> = {
  ransomware_claim: '/romania-cyber-monitor/ransomware',
  verified_breach: '/romania-cyber-monitor/breaches',
  public_exposure: '/romania-cyber-monitor/exposures',
  threat_indicator: '/romania-cyber-monitor/threat-infrastructure',
  malware_distribution: '/romania-cyber-monitor/malware',
  malware_intelligence: '/romania-cyber-monitor/malware',
};

export const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  unverified_claim: 'Unverified claim',
  source_verified: 'Source-verified',
  media_corroborated: 'Media-corroborated',
  organisation_confirmed: 'Confirmed by organisation',
  authority_confirmed: 'Confirmed by authority',
  disputed: 'Disputed',
  false_positive: 'False positive',
};

export function formatIsoDate(iso: string | null): string {
  if (!iso) return 'Unknown date';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
