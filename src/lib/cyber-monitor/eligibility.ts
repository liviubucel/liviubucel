// Romania Cyber Monitor - Romania Eligibility Engine.
//
// This is the single choke point every imported record must pass through
// before it can become publicly visible. Only the six high-confidence
// conditions documented in docs/romania-cyber-monitor.md may produce a
// "high" confidence, auto-publishable result. Everything else is, at best,
// a "medium" confidence review candidate that stays internal.

import type { CountryConfidence, RomaniaRelationshipBasis } from './types';

const ROMANIA_COUNTRY_CODES = new Set(['RO', 'ROU']);
const ROMANIA_COUNTRY_NAMES = new Set(['romania', 'roumanie', 'rumänien']);

export interface RomaniaEligibilitySignals {
  /** Upstream source explicitly assigned country code, e.g. "RO". */
  sourceCountryCode?: string | null;
  /** Upstream source explicitly assigned country name, e.g. "Romania". */
  sourceCountryName?: string | null;
  /** The organisation matched an entry in the curated organisation registry. */
  verifiedOrganisationMatch?: boolean;
  /** The affected domain matched a verified organisation_domains entry. */
  verifiedOrganisationDomainMatch?: boolean;
  /**
   * The IP's ASN matched a verified Romanian ASN AND the record clearly
   * describes Romania-hosted infrastructure, not a Romanian attacker.
   */
  verifiedRomanianAsnHostingMatch?: boolean;
  /** The source itself is an official/authoritative Romanian source (e.g. DNSC). */
  officialSource?: boolean;
  /** An editor manually confirmed the Romania relationship with recorded evidence. */
  manualEditorialConfirmation?: {
    confirmedBy: string;
    evidence: string;
  };
}

/**
 * Signals that look Romania-related but are explicitly insufficient on
 * their own per the eligibility policy. Detecting one of these creates a
 * "medium" confidence review candidate - never an automatic publication.
 */
export interface RomaniaWeakSignalInputs {
  /** e.g. ".ro" */
  domainTld?: string | null;
  /** Heuristic Romanian-language detection on unstructured text. */
  containsRomanianLanguageHeuristic?: boolean;
  /** Romania mentioned in an unstructured description. */
  mentionsRomania?: boolean;
  /** A Romanian-format telephone number was detected. */
  romanianPhoneNumberDetected?: boolean;
  /** GeoIP says the IP is in Romania, but the ASN is not in our verified registry. */
  unverifiedRomanianIp?: boolean;
  /** A Romanian company name was inferred from free text (not a verified match). */
  inferredRomanianCompanyName?: boolean;
}

export interface RomaniaEligibilityResult {
  /** True only for "high" confidence records - the only tier that may auto-publish. */
  eligible: boolean;
  basis: RomaniaRelationshipBasis | null;
  confidence: CountryConfidence;
  reason: string;
}

function isRomaniaCountryCode(code?: string | null): boolean {
  if (!code) return false;
  return ROMANIA_COUNTRY_CODES.has(code.trim().toUpperCase());
}

function isRomaniaCountryName(name?: string | null): boolean {
  if (!name) return false;
  return ROMANIA_COUNTRY_NAMES.has(name.trim().toLowerCase());
}

/**
 * Evaluates only the six high-confidence conditions. Returns `eligible: true`
 * if and only if a high-confidence basis was established.
 */
export function evaluateHighConfidenceEligibility(
  signals: RomaniaEligibilitySignals
): RomaniaEligibilityResult {
  if (signals.manualEditorialConfirmation) {
    const { confirmedBy, evidence } = signals.manualEditorialConfirmation;
    return {
      eligible: true,
      basis: 'manual_editorial_confirmation',
      confidence: 'high',
      reason: `Manually confirmed by ${confirmedBy}: ${evidence}`,
    };
  }

  if (signals.officialSource) {
    return {
      eligible: true,
      basis: 'official_source',
      confidence: 'high',
      reason: 'Sourced directly from an official/authoritative source.',
    };
  }

  if (isRomaniaCountryCode(signals.sourceCountryCode) || isRomaniaCountryName(signals.sourceCountryName)) {
    return {
      eligible: true,
      basis: 'source_country_ro',
      confidence: 'high',
      reason: 'Upstream source explicitly assigned Romania as the country.',
    };
  }

  if (signals.verifiedOrganisationDomainMatch) {
    return {
      eligible: true,
      basis: 'verified_organisation_domain',
      confidence: 'high',
      reason: 'Affected domain matched a verified Romanian organisation domain.',
    };
  }

  if (signals.verifiedOrganisationMatch) {
    return {
      eligible: true,
      basis: 'verified_romanian_organisation',
      confidence: 'high',
      reason: 'Organisation matched the curated Romanian organisation registry.',
    };
  }

  if (signals.verifiedRomanianAsnHostingMatch) {
    return {
      eligible: true,
      basis: 'verified_romanian_asn',
      confidence: 'high',
      reason: 'IP matched a verified Romanian ASN and is described as Romania-hosted infrastructure.',
    };
  }

  return {
    eligible: false,
    basis: null,
    confidence: 'low',
    reason: 'No high-confidence Romania relationship established.',
  };
}

/** True if any documented-insufficient signal is present. */
export function hasWeakRomaniaSignal(weak: RomaniaWeakSignalInputs): boolean {
  return Boolean(
    weak.domainTld === '.ro' ||
      weak.containsRomanianLanguageHeuristic ||
      weak.mentionsRomania ||
      weak.romanianPhoneNumberDetected ||
      weak.unverifiedRomanianIp ||
      weak.inferredRomanianCompanyName
  );
}

/**
 * Full evaluation: high-confidence signals first; if none apply, checks for
 * weak signals that qualify the record as a "medium" confidence review
 * candidate. Anything else is "low" confidence and should not even enter
 * the review queue as a Romania candidate.
 */
export function evaluateRomaniaEligibility(
  strong: RomaniaEligibilitySignals,
  weak: RomaniaWeakSignalInputs = {}
): RomaniaEligibilityResult {
  const highConfidenceResult = evaluateHighConfidenceEligibility(strong);
  if (highConfidenceResult.eligible) {
    return highConfidenceResult;
  }

  if (hasWeakRomaniaSignal(weak)) {
    return {
      eligible: false,
      basis: null,
      confidence: 'medium',
      reason:
        'A Romania-related signal was detected (e.g. .ro domain, language, phone number, or unverified IP) but does not meet the high-confidence bar. Requires editorial review before publication.',
    };
  }

  return {
    eligible: false,
    basis: null,
    confidence: 'low',
    reason: 'No Romania relationship signal detected.',
  };
}
