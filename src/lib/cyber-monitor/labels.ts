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

export const RECORD_TYPE_LABEL_RO: Record<RecordType, string> = {
  ransomware_claim: 'Revendicare ransomware',
  verified_breach: 'Breșă verificată',
  public_exposure: 'Expunere publică',
  threat_indicator: 'Indicator de amenințare',
  malware_distribution: 'Distribuție malware',
  malware_intelligence: 'Informații despre malware',
  aggregate_statistics: 'Statistici agregate',
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

export const VERIFICATION_STATUS_LABEL_RO: Record<string, string> = {
  unverified_claim: 'Revendicare neverificată',
  source_verified: 'Verificat de sursă',
  media_corroborated: 'Confirmat de presă',
  organisation_confirmed: 'Confirmat de organizație',
  authority_confirmed: 'Confirmat de autorități',
  disputed: 'Contestat',
  false_positive: 'Fals pozitiv',
};

export function formatIsoDate(iso: string | null, lang: 'en' | 'ro' = 'en'): string {
  if (!iso) return lang === 'ro' ? 'Dată necunoscută' : 'Unknown date';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const locale = lang === 'ro' ? 'ro-RO' : 'en-GB';
  return parsed.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
