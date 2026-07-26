import { describe, expect, it } from 'vitest';
import { buildRomanianArticle, generateIncidentArticle } from './article-generation';
import type { NormalisedIncident } from './types';

function baseIncident(overrides: Partial<NormalisedIncident> = {}): NormalisedIncident {
  return {
    slug: 'acme-corp-lockbit-abc12345',
    recordType: 'ransomware_claim',
    organisationId: null,
    organisationDisplayName: 'Acme Corp SRL',
    threatGroupId: 'lockbit',
    countryCode: 'RO',
    romaniaRelationshipBasis: 'source_country_ro',
    countryConfidence: 'high',
    incidentDate: null,
    discoveredDate: '2026-01-05',
    firstObserved: '2026-01-05',
    lastObserved: '2026-01-05',
    verificationStatus: 'unverified_claim',
    editorialStatus: 'published',
    summary: 'lockbit listed Acme Corp SRL on a data-leak site.',
    sector: null,
    independentlyConfirmed: false,
    dedupKey: 'abc12345abc12345abc12345abc12345abc12345abc12345abc12345abc1234',
    source: {
      sourceId: 'ransomware_live',
      upstreamRecordId: 'x',
      sourceUrl: null,
      title: 'Acme Corp SRL listed by lockbit',
      sourcePublicationDate: '2026-01-05',
      payloadHash: 'x',
      authoritative: false,
      corroboratesClaim: true,
      sanitisedMetadata: {},
    },
    ...overrides,
  };
}

describe('generateIncidentArticle - ransomware_claim', () => {
  it('generates an incident_brief article', () => {
    const article = generateIncidentArticle(baseIncident());
    expect(article).not.toBeNull();
    expect(article?.articleType).toBe('incident_brief');
  });

  it('never uses "confirmed breach" or "hacked" wording', () => {
    const article = generateIncidentArticle(baseIncident());
    const text = `${article?.title} ${article?.excerpt} ${article?.body}`;
    expect(text).not.toMatch(/\bconfirmed breach\b/i);
    expect(text).not.toMatch(/\bhacked\b/i);
    expect(text).not.toMatch(/\battack confirmed\b/i);
  });

  it('includes the mandated "not independently confirmed" language', () => {
    const article = generateIncidentArticle(baseIncident());
    expect(article?.body).toContain('has not been independently confirmed');
  });

  it('includes the mandated ransomware-claim disclaimer sentence', () => {
    const article = generateIncidentArticle(baseIncident());
    expect(article?.body).toContain('does not by itself prove that the organisation was compromised');
  });

  it('never fabricates an attack vector, ransom amount, or attribution detail not present in the incident', () => {
    const article = generateIncidentArticle(baseIncident());
    const text = article?.body ?? '';
    expect(text).not.toMatch(/ransom (of|amount)/i);
    expect(text).not.toMatch(/initial access/i);
    expect(text).not.toMatch(/exfiltrated \d/i);
  });

  it('produces a deterministic slug for the same incident', () => {
    const a = generateIncidentArticle(baseIncident());
    const b = generateIncidentArticle(baseIncident());
    expect(a?.slug).toBe(b?.slug);
  });
});

describe('generateIncidentArticle - verified_breach', () => {
  const breachIncident = baseIncident({
    recordType: 'verified_breach',
    incidentDate: '2025-06-01',
    discoveredDate: '2025-06-10',
    verificationStatus: 'source_verified',
  });

  it('generates a verified_breach_profile article', () => {
    const article = generateIncidentArticle(breachIncident);
    expect(article?.articleType).toBe('verified_breach_profile');
  });

  it('clarifies that verification reflects HIBP’s own process, not a Romanian authority', () => {
    const article = generateIncidentArticle(breachIncident);
    expect(article?.body).toContain('not confirmation by a Romanian authority');
  });

  it('reflects an unverified HIBP status truthfully', () => {
    const article = generateIncidentArticle({ ...breachIncident, verificationStatus: 'unverified_claim' });
    expect(article?.body).toContain('unverified within the Have I Been Pwned catalogue');
  });
});

describe('generateIncidentArticle - unsupported record types', () => {
  it('returns null for a record type with no article template yet', () => {
    const article = generateIncidentArticle(baseIncident({ recordType: 'aggregate_statistics' }));
    expect(article).toBeNull();
  });
});

describe('buildRomanianArticle', () => {
  it('uses the translated fields and marks the article as Romanian', () => {
    const en = generateIncidentArticle(baseIncident())!;
    const ro = buildRomanianArticle(
      en,
      { title: 'Titlu RO', excerpt: 'Rezumat RO', body: 'Corp RO' },
      baseIncident().dedupKey
    );

    expect(ro.language).toBe('ro');
    expect(ro.title).toBe('Titlu RO');
    expect(ro.excerpt).toBe('Rezumat RO');
    expect(ro.body).toBe('Corp RO');
    expect(ro.articleType).toBe(en.articleType);
  });

  it('produces a slug distinct from the English article (slug is globally unique)', () => {
    const en = generateIncidentArticle(baseIncident())!;
    const ro = buildRomanianArticle(
      en,
      { title: en.title, excerpt: 'x', body: 'y' },
      baseIncident().dedupKey
    );

    expect(ro.slug).not.toBe(en.slug);
  });
});
