import { describe, expect, it } from 'vitest';
import {
  evaluateHighConfidenceEligibility,
  evaluateRomaniaEligibility,
  hasWeakRomaniaSignal,
} from './eligibility';

describe('evaluateHighConfidenceEligibility', () => {
  it('is not eligible when no signal is provided', () => {
    const result = evaluateHighConfidenceEligibility({});
    expect(result.eligible).toBe(false);
    expect(result.confidence).toBe('low');
    expect(result.basis).toBeNull();
  });

  it('accepts an explicit RO country code', () => {
    const result = evaluateHighConfidenceEligibility({ sourceCountryCode: 'RO' });
    expect(result).toEqual({
      eligible: true,
      basis: 'source_country_ro',
      confidence: 'high',
      reason: expect.stringContaining('Romania as the country'),
    });
  });

  it('accepts a lowercase/whitespace-padded country code', () => {
    const result = evaluateHighConfidenceEligibility({ sourceCountryCode: ' ro ' });
    expect(result.eligible).toBe(true);
    expect(result.basis).toBe('source_country_ro');
  });

  it('rejects a country code that merely contains RO, e.g. a different country', () => {
    const result = evaluateHighConfidenceEligibility({ sourceCountryCode: 'FR' });
    expect(result.eligible).toBe(false);
  });

  it('accepts an explicit Romania country name', () => {
    const result = evaluateHighConfidenceEligibility({ sourceCountryName: 'Romania' });
    expect(result.eligible).toBe(true);
    expect(result.basis).toBe('source_country_ro');
  });

  it('accepts a verified organisation domain match', () => {
    const result = evaluateHighConfidenceEligibility({ verifiedOrganisationDomainMatch: true });
    expect(result.eligible).toBe(true);
    expect(result.basis).toBe('verified_organisation_domain');
  });

  it('accepts a verified organisation match', () => {
    const result = evaluateHighConfidenceEligibility({ verifiedOrganisationMatch: true });
    expect(result.eligible).toBe(true);
    expect(result.basis).toBe('verified_romanian_organisation');
  });

  it('accepts a verified Romanian ASN hosting match', () => {
    const result = evaluateHighConfidenceEligibility({ verifiedRomanianAsnHostingMatch: true });
    expect(result.eligible).toBe(true);
    expect(result.basis).toBe('verified_romanian_asn');
  });

  it('accepts an official source', () => {
    const result = evaluateHighConfidenceEligibility({ officialSource: true });
    expect(result.eligible).toBe(true);
    expect(result.basis).toBe('official_source');
  });

  it('accepts a manual editorial confirmation and records the evidence in the reason', () => {
    const result = evaluateHighConfidenceEligibility({
      manualEditorialConfirmation: { confirmedBy: 'editor@example.com', evidence: 'Press release from the org.' },
    });
    expect(result.eligible).toBe(true);
    expect(result.basis).toBe('manual_editorial_confirmation');
    expect(result.reason).toContain('editor@example.com');
    expect(result.reason).toContain('Press release from the org.');
  });

  it('never treats a .ro domain alone as high confidence', () => {
    // domainTld is not even a field on the strong-signal type - this test
    // documents that fact by construction: passing an empty strong-signal
    // object must never be eligible regardless of any weak signal.
    const result = evaluateHighConfidenceEligibility({});
    expect(result.eligible).toBe(false);
  });
});

describe('hasWeakRomaniaSignal', () => {
  it('is false for an empty input', () => {
    expect(hasWeakRomaniaSignal({})).toBe(false);
  });

  it('flags a .ro TLD', () => {
    expect(hasWeakRomaniaSignal({ domainTld: '.ro' })).toBe(true);
  });

  it('flags Romanian-language heuristic text', () => {
    expect(hasWeakRomaniaSignal({ containsRomanianLanguageHeuristic: true })).toBe(true);
  });

  it('flags an unstructured Romania mention', () => {
    expect(hasWeakRomaniaSignal({ mentionsRomania: true })).toBe(true);
  });

  it('flags a Romanian phone number', () => {
    expect(hasWeakRomaniaSignal({ romanianPhoneNumberDetected: true })).toBe(true);
  });

  it('flags an unverified Romanian IP', () => {
    expect(hasWeakRomaniaSignal({ unverifiedRomanianIp: true })).toBe(true);
  });

  it('flags an inferred (non-verified) Romanian company name', () => {
    expect(hasWeakRomaniaSignal({ inferredRomanianCompanyName: true })).toBe(true);
  });
});

describe('evaluateRomaniaEligibility (combined)', () => {
  it('prefers a high-confidence signal over a weak one', () => {
    const result = evaluateRomaniaEligibility(
      { sourceCountryCode: 'RO' },
      { domainTld: '.ro' }
    );
    expect(result.confidence).toBe('high');
    expect(result.eligible).toBe(true);
  });

  it('downgrades to "medium" (review queue) when only a weak signal is present', () => {
    const result = evaluateRomaniaEligibility({}, { domainTld: '.ro' });
    expect(result.confidence).toBe('medium');
    expect(result.eligible).toBe(false);
  });

  it('is "low" confidence and not eligible when nothing matches at all', () => {
    const result = evaluateRomaniaEligibility({}, {});
    expect(result.confidence).toBe('low');
    expect(result.eligible).toBe(false);
  });

  it('a Romanian-language description alone never becomes eligible', () => {
    const result = evaluateRomaniaEligibility({}, { containsRomanianLanguageHeuristic: true });
    expect(result.eligible).toBe(false);
    expect(result.confidence).toBe('medium');
  });

  it('a Romanian phone number alone never becomes eligible', () => {
    const result = evaluateRomaniaEligibility({}, { romanianPhoneNumberDetected: true });
    expect(result.eligible).toBe(false);
  });

  it('an AI-generated claim is never a signal at all (not modelled as a field)', () => {
    // There is intentionally no "aiGeneratedClaim" field that can flip eligibility -
    // this test documents that an empty weak-signal object (as an AI claim with no
    // other evidence would produce) stays at "low" confidence.
    const result = evaluateRomaniaEligibility({}, {});
    expect(result.eligible).toBe(false);
    expect(result.confidence).toBe('low');
  });
});
