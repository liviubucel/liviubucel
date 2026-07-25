// Romania Cyber Monitor - read-only D1 queries backing the public pages.
// Every query here filters to editorial_status IN ('published', 'updated')
// for incidents (never 'needs_review', 'candidate', 'retracted', etc.) -
// this is the only gate between the ingestion pipeline and what a visitor
// can see.

import type { RecordType } from './types';

export interface PublicIncidentRow {
  id: string;
  slug: string;
  recordType: RecordType;
  organisationDisplayName: string | null;
  threatGroupId: string | null;
  countryConfidence: 'high' | 'medium' | 'low';
  incidentDate: string | null;
  discoveredDate: string | null;
  verificationStatus: string;
  summary: string | null;
  sector: string | null;
  publishedAt: string;
  articleTitle: string | null;
  articleExcerpt: string | null;
}

interface IncidentQueryRow {
  id: string;
  slug: string;
  record_type: RecordType;
  organisation_display_name: string | null;
  threat_group_id: string | null;
  country_confidence: 'high' | 'medium' | 'low';
  incident_date: string | null;
  discovered_date: string | null;
  verification_status: string;
  summary: string | null;
  sector: string | null;
  published_at: string;
  article_title: string | null;
  article_excerpt: string | null;
}

function mapIncidentRow(row: IncidentQueryRow): PublicIncidentRow {
  return {
    id: row.id,
    slug: row.slug,
    recordType: row.record_type,
    organisationDisplayName: row.organisation_display_name,
    threatGroupId: row.threat_group_id,
    countryConfidence: row.country_confidence,
    incidentDate: row.incident_date,
    discoveredDate: row.discovered_date,
    verificationStatus: row.verification_status,
    summary: row.summary,
    sector: row.sector,
    publishedAt: row.published_at,
    articleTitle: row.article_title,
    articleExcerpt: row.article_excerpt,
  };
}

const INCIDENT_LIST_SELECT = `
  SELECT
    i.id, i.slug, i.record_type, i.organisation_display_name, i.threat_group_id,
    i.country_confidence, i.incident_date, i.discovered_date, i.verification_status,
    i.summary, i.sector, i.published_at,
    a.title AS article_title, a.excerpt AS article_excerpt
  FROM incidents i
  LEFT JOIN articles a ON a.related_incident_id = i.id AND a.status = 'published'
  WHERE i.editorial_status IN ('published', 'updated')
`;

export interface ListIncidentsOptions {
  recordType?: RecordType;
  limit?: number;
  offset?: number;
}

// Ordered by when the incident actually happened/was reported upstream
// (discovered_date, falling back to incident_date then our own
// published_at) - not by our own ingestion time. A source like
// Ransomware.live's country-victims feed returns its *entire* history in
// one response, so sorting by published_at would put everything ingested
// in the same sync run in an arbitrary order regardless of how old the
// real-world listing is.
const RECENCY_ORDER = 'COALESCE(i.discovered_date, i.incident_date, i.published_at) DESC';

export async function listPublicIncidents(
  db: D1Database,
  { recordType, limit = 20, offset = 0 }: ListIncidentsOptions = {}
): Promise<PublicIncidentRow[]> {
  const query = recordType
    ? `${INCIDENT_LIST_SELECT} AND i.record_type = ?1 ORDER BY ${RECENCY_ORDER} LIMIT ?2 OFFSET ?3`
    : `${INCIDENT_LIST_SELECT} ORDER BY ${RECENCY_ORDER} LIMIT ?1 OFFSET ?2`;

  const stmt = recordType ? db.prepare(query).bind(recordType, limit, offset) : db.prepare(query).bind(limit, offset);

  const { results } = await stmt.all<IncidentQueryRow>();
  return (results ?? []).map(mapIncidentRow);
}

export async function countPublicIncidents(db: D1Database, recordType?: RecordType): Promise<number> {
  const query = recordType
    ? `SELECT COUNT(*) AS count FROM incidents WHERE editorial_status IN ('published', 'updated') AND record_type = ?1`
    : `SELECT COUNT(*) AS count FROM incidents WHERE editorial_status IN ('published', 'updated')`;

  const stmt = recordType ? db.prepare(query).bind(recordType) : db.prepare(query);
  const row = await stmt.first<{ count: number }>();
  return row?.count ?? 0;
}

export interface PublicIncidentDetail extends PublicIncidentRow {
  articleBody: string | null;
  articleLanguage: string | null;
  sources: Array<{
    sourceId: string;
    title: string | null;
    sourceUrl: string | null;
    sourcePublicationDate: string | null;
    authoritative: boolean;
  }>;
}

export async function getPublicIncidentBySlug(db: D1Database, slug: string): Promise<PublicIncidentDetail | null> {
  const incidentRow = await db
    .prepare(
      `SELECT
        i.id, i.slug, i.record_type, i.organisation_display_name, i.threat_group_id,
        i.country_confidence, i.incident_date, i.discovered_date, i.verification_status,
        i.summary, i.sector, i.published_at,
        a.title AS article_title, a.excerpt AS article_excerpt, a.body AS article_body,
        a.language AS article_language
      FROM incidents i
      LEFT JOIN articles a ON a.related_incident_id = i.id AND a.status = 'published'
      WHERE i.slug = ?1 AND i.editorial_status IN ('published', 'updated')
      LIMIT 1`
    )
    .bind(slug)
    .first<IncidentQueryRow & { article_body: string | null; article_language: string | null }>();

  if (!incidentRow) return null;

  const { results: sourceRows } = await db
    .prepare(
      `SELECT source_id, title, source_url, source_publication_date, authoritative
       FROM incident_sources WHERE incident_id = ?1 ORDER BY retrieved_at ASC`
    )
    .bind(incidentRow.id)
    .all<{
      source_id: string;
      title: string | null;
      source_url: string | null;
      source_publication_date: string | null;
      authoritative: number;
    }>();

  return {
    ...mapIncidentRow(incidentRow),
    articleBody: incidentRow.article_body,
    articleLanguage: incidentRow.article_language,
    sources: (sourceRows ?? []).map((row) => ({
      sourceId: row.source_id,
      title: row.title,
      sourceUrl: row.source_url,
      sourcePublicationDate: row.source_publication_date,
      authoritative: row.authoritative === 1,
    })),
  };
}

export interface PublicExposureRow {
  exposureType: string;
  severity: string | null;
  affectedServiceType: string | null;
  hostingOrganisation: string | null;
  countryIsoCode: string | null;
  sector: string | null;
  observedMonth: string;
}

export async function listPublicExposures(db: D1Database, limit = 50): Promise<PublicExposureRow[]> {
  const { results } = await db
    .prepare(
      `SELECT exposure_type, severity, affected_service_type, hosting_organisation, country_iso_code, sector, observed_month
       FROM exposures ORDER BY observed_month DESC, created_at DESC LIMIT ?1`
    )
    .bind(limit)
    .all<{
      exposure_type: string;
      severity: string | null;
      affected_service_type: string | null;
      hosting_organisation: string | null;
      country_iso_code: string | null;
      sector: string | null;
      observed_month: string;
    }>();

  return (results ?? []).map((row) => ({
    exposureType: row.exposure_type,
    severity: row.severity,
    affectedServiceType: row.affected_service_type,
    hostingOrganisation: row.hosting_organisation,
    countryIsoCode: row.country_iso_code,
    sector: row.sector,
    observedMonth: row.observed_month,
  }));
}

export interface PublicIndicatorRow {
  iocType: string;
  defangedValue: string;
  malwareFamily: string | null;
  threatType: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  active: boolean;
}

export async function listPublicIndicators(db: D1Database, limit = 50): Promise<PublicIndicatorRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ioc_type, defanged_value, malware_family, threat_type, first_seen, last_seen, active
       FROM indicators WHERE active = 1 ORDER BY last_seen DESC LIMIT ?1`
    )
    .bind(limit)
    .all<{
      ioc_type: string;
      defanged_value: string;
      malware_family: string | null;
      threat_type: string | null;
      first_seen: string | null;
      last_seen: string | null;
      active: number;
    }>();

  return (results ?? []).map((row) => ({
    iocType: row.ioc_type,
    defangedValue: row.defanged_value,
    malwareFamily: row.malware_family,
    threatType: row.threat_type,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    active: row.active === 1,
  }));
}

export interface PublicMalwareRow {
  sha256Hash: string;
  signature: string | null;
  family: string | null;
  fileType: string | null;
  firstSeen: string | null;
  referenceUrl: string | null;
}

export async function listPublicMalwareMetadata(db: D1Database, limit = 50): Promise<PublicMalwareRow[]> {
  const { results } = await db
    .prepare(
      `SELECT sha256_hash, signature, family, file_type, first_seen, reference_url
       FROM malware_metadata ORDER BY first_seen DESC LIMIT ?1`
    )
    .bind(limit)
    .all<{
      sha256_hash: string;
      signature: string | null;
      family: string | null;
      file_type: string | null;
      first_seen: string | null;
      reference_url: string | null;
    }>();

  return (results ?? []).map((row) => ({
    sha256Hash: row.sha256_hash,
    signature: row.signature,
    family: row.family,
    fileType: row.file_type,
    firstSeen: row.first_seen,
    referenceUrl: row.reference_url,
  }));
}
