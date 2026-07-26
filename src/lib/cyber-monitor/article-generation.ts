// Romania Cyber Monitor - automatic article generation.
//
// Per operator decision, generated articles publish immediately (no
// editorial review step) - see the eligibility engine and each adapter's
// header comment for why this is considered safe: only records that
// already passed the high-confidence Romania eligibility gate ever reach
// this point, and every template below uses only deterministic,
// evidence-based wording. Nothing here infers attack vector, stolen
// volume, ransom amount, attribution, or business impact - only what the
// source data actually states.

import type { NormalisedIncident } from './types';
import { slugify } from './slugify';
import { describeSectorContext, describeThreatGroup, getThreatGroupProfile } from './threat-groups';

// threatGroupId is a slug (e.g. "black-basta"), not a display name. Use the
// curated profile's proper name when we have one; otherwise title-case the
// slug so it at least reads like a name instead of a raw identifier.
function formatGroupDisplayName(threatGroupId: string | null): string {
  if (!threatGroupId) return 'a ransomware group';
  const profile = getThreatGroupProfile(threatGroupId);
  if (profile) return profile.name;
  return threatGroupId
    .split('-')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

const RANSOMWARE_CLAIM_DISCLAIMER =
  'This entry records a public claim made by a ransomware group. It does not by itself prove that the organisation was compromised or that the threat actor’s statements are accurate.';

// Generic, universally-applicable hardening guidance - never incident-specific
// claims. Safe to state for any organisation regardless of what actually
// happened here, and it's the genuinely useful part of the page: turning a
// bare feed entry into something a reader can act on.
const RANSOMWARE_GUIDANCE = [
  '- Keep offline, tested backups - ransomware operators routinely target backup systems first; a backup you have never restored from is not a backup.',
  '- Enforce multi-factor authentication on every remote-access point (VPN, RDP, email, admin panels) - stolen or weak credentials remain the most common entry point.',
  '- Patch internet-facing systems promptly - most ransomware intrusions start from a known, unpatched vulnerability, not a novel exploit.',
  '- Segment your network so a single compromised workstation cannot reach domain controllers or backup infrastructure directly.',
  '- Have a written incident response plan and know who to call (a Romanian incident responder, DNSC, your insurer) before an incident happens, not during one.',
];

const BREACH_GUIDANCE_INDIVIDUALS = [
  '- Change the password for any account that used the same password as this service, and use a unique password per site going forward (a password manager makes this practical).',
  '- Enable multi-factor authentication wherever it is offered - it stops the overwhelming majority of account-takeover attempts even after a password leaks.',
  '- Watch for phishing referencing this breach - attackers frequently use breach news itself as a pretext to send convincing fake "verify your account" emails.',
  '- Check whether your email address appears in other breaches at haveibeenpwned.com.',
];

const BREACH_GUIDANCE_ORGANISATIONS = [
  '- If you operate the named service, confirm the scope of the exposure and notify affected users and, where applicable, the Romanian data protection authority (ANSPDCP) within the legal timeframe.',
  '- Rotate any credentials, API keys, or tokens that could plausibly have been exposed alongside the breached data.',
  '- Review authentication logs for the affected period for signs the exposed credentials were actually used elsewhere.',
];

// EN by default; buildRomanianArticle() rewrites this link to /ro/contact
// after translation, since the translator is instructed to preserve
// Markdown links exactly (so it would otherwise carry the EN path through
// verbatim onto the Romanian page).
const NEED_HELP_CTA =
  'If you want a proper, individualised review of your security posture rather than a generic checklist - hardening, incident response planning, or a full audit - [get in touch](/contact).';

function formatDate(value: string | null): string {
  if (!value) return 'an unspecified date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// Only the fields the templates below actually read - lets both the live
// sync path (a full NormalisedIncident) and the D1-row-based backfill path
// (article-content-backfill.ts, reconstructed from the incidents table)
// share one code path without needing to fabricate the rest of
// NormalisedIncident's fields.
export type ArticleSourceIncident = Pick<
  NormalisedIncident,
  | 'recordType'
  | 'organisationDisplayName'
  | 'threatGroupId'
  | 'discoveredDate'
  | 'incidentDate'
  | 'summary'
  | 'verificationStatus'
  | 'sector'
  | 'dedupKey'
>;

function buildRansomwareClaimBrief(incident: ArticleSourceIncident): { title: string; excerpt: string; body: string } {
  const org = incident.organisationDisplayName ?? 'an organisation';
  const group = formatGroupDisplayName(incident.threatGroupId);
  const discovered = formatDate(incident.discoveredDate);
  const sectorContext = describeSectorContext(incident.sector);

  const title = `${org}: ransomware group listing (unconfirmed claim)`;
  const excerpt = `${group} listed ${org} on a data-leak site monitored by public ransomware intelligence sources. Not independently confirmed.`;

  const body = [
    `## Executive summary`,
    `On ${discovered}, ${group} listed ${org} on a data-leak site monitored by public ransomware intelligence sources.`,
    ``,
    `## What was reported`,
    incident.summary ?? `${group} added ${org} to its victim list.`,
    incident.sector ? `${org} is reported to operate in the ${incident.sector} sector.` : null,
    ``,
    `## What has been independently confirmed`,
    `At the time of writing, this claim has not been independently confirmed by the organisation, DNSC, another Romanian authority, or another authoritative source.`,
    ``,
    `## Timeline`,
    `- Discovered/listed: ${discovered}`,
    incident.incidentDate ? `- Alleged incident date: ${formatDate(incident.incidentDate)}` : null,
    ``,
    `## About ${group}`,
    describeThreatGroup(incident.threatGroupId, group),
    ``,
    sectorContext ? `## Why this sector is targeted` : null,
    sectorContext,
    sectorContext ? `` : null,
    `## What organisations can do about ransomware risk`,
    `Regardless of whether this specific claim is accurate, ransomware remains one of the most common serious incidents Romanian organisations face. The basics below stop most attacks before they reach the encryption stage:`,
    ...RANSOMWARE_GUIDANCE,
    ``,
    `## Methodology and limitations`,
    `This page is generated automatically from a public ransomware threat-intelligence feed. See /methodology for the full Romania eligibility and verification policy.`,
    ``,
    RANSOMWARE_CLAIM_DISCLAIMER,
    ``,
    NEED_HELP_CTA,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { title, excerpt, body };
}

function buildVerifiedBreachBrief(incident: ArticleSourceIncident): { title: string; excerpt: string; body: string } {
  const org = incident.organisationDisplayName ?? 'an organisation';
  const breachDate = formatDate(incident.incidentDate);
  const addedDate = formatDate(incident.discoveredDate);
  const sectorContext = describeSectorContext(incident.sector);

  const title = `${org}: entry added to the breach catalogue`;
  const excerpt = `${org} was added to the Have I Been Pwned breach catalogue, with an alleged breach date of ${breachDate}.`;

  const body = [
    `## Executive summary`,
    `${org} appears in the Have I Been Pwned breach catalogue, added on ${addedDate} with an alleged breach date of ${breachDate}.`,
    incident.sector ? `${org} is reported to operate in the ${incident.sector} sector.` : null,
    ``,
    `## What was reported`,
    incident.summary ?? `${org} was added to the breach catalogue.`,
    ``,
    `## Verification status`,
    incident.verificationStatus === 'source_verified'
      ? 'This breach is marked as verified within the Have I Been Pwned catalogue.'
      : 'This breach is marked as unverified within the Have I Been Pwned catalogue.',
    `This reflects Have I Been Pwned’s own catalogue process, not confirmation by a Romanian authority.`,
    ``,
    sectorContext ? `## Why this sector is targeted` : null,
    sectorContext,
    sectorContext ? `` : null,
    `## If you think your data may be affected`,
    ...BREACH_GUIDANCE_INDIVIDUALS,
    ``,
    `## For organisations`,
    ...BREACH_GUIDANCE_ORGANISATIONS,
    ``,
    `## Methodology and limitations`,
    `This page is generated automatically from a public breach-catalogue feed. See /methodology for the full Romania eligibility and verification policy.`,
    ``,
    NEED_HELP_CTA,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { title, excerpt, body };
}

export interface GeneratedArticle {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  articleType: 'incident_brief' | 'verified_breach_profile';
  language: 'en' | 'ro';
}

/** Builds a deterministic article draft for a newly published incident.
 * Returns null for record types this generator doesn't yet cover. */
export function generateIncidentArticle(incident: ArticleSourceIncident): GeneratedArticle | null {
  if (incident.recordType === 'ransomware_claim') {
    const { title, excerpt, body } = buildRansomwareClaimBrief(incident);
    return {
      slug: `${slugify(title)}-${incident.dedupKey.slice(0, 8)}`,
      title,
      excerpt,
      body,
      articleType: 'incident_brief',
      language: 'en',
    };
  }

  if (incident.recordType === 'verified_breach') {
    const { title, excerpt, body } = buildVerifiedBreachBrief(incident);
    return {
      slug: `${slugify(title)}-${incident.dedupKey.slice(0, 8)}`,
      title,
      excerpt,
      body,
      articleType: 'verified_breach_profile',
      language: 'en',
    };
  }

  return null;
}

/** Builds the Romanian counterpart of a generated article from already-
 * translated fields. Uses a distinct slug (articles.slug is globally unique
 * across languages) so it never collides with the English row. */
export function buildRomanianArticle(
  enArticle: GeneratedArticle,
  translated: { title: string; excerpt: string; body: string },
  dedupKey: string
): GeneratedArticle {
  return {
    slug: `${slugify(translated.title)}-ro-${dedupKey.slice(0, 8)}`,
    title: translated.title,
    excerpt: translated.excerpt,
    // The translator is told to preserve Markdown links exactly, so the
    // NEED_HELP_CTA's /contact link survives translation unchanged - route
    // it to the Romanian contact page instead.
    body: translated.body.replaceAll('(/contact)', '(/ro/contact)'),
    articleType: enArticle.articleType,
    language: 'ro',
  };
}

export async function persistGeneratedArticle(
  db: D1Database,
  article: GeneratedArticle,
  relatedIncidentId: string,
  nowIso: string
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO articles (
        id, slug, title, excerpt, article_type, language, status, body, related_incident_id,
        generated_automatically, published_at, created_at, updated_at
      ) VALUES (?1,?2,?3,?4,?5,?6,'published',?7,?8,1,?9,?9,?9)`
    )
    .bind(
      crypto.randomUUID(),
      article.slug,
      article.title,
      article.excerpt,
      article.articleType,
      article.language,
      article.body,
      relatedIncidentId,
      nowIso
    )
    .run();
}
