// Romania Cyber Monitor - D1 persistence for each normalised record shape.
// Every insert is dedup-key-gated: a record that already exists is only
// ever updated (last_observed / updated_at), never duplicated.

import type {
  NormalisedAggregateStatistic,
  NormalisedExposure,
  NormalisedIncident,
  NormalisedIndicator,
  NormalisedMalwareMetadata,
} from './types';

export type PersistOutcome = 'inserted' | 'updated';

export async function persistIncident(db: D1Database, record: NormalisedIncident, nowIso: string): Promise<PersistOutcome> {
  const existing = await db
    .prepare('SELECT id FROM incidents WHERE dedup_key = ?1')
    .bind(record.dedupKey)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare('UPDATE incidents SET last_observed = ?1, updated_at = ?2 WHERE id = ?3')
      .bind(record.lastObserved, nowIso, existing.id)
      .run();
    return 'updated';
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO incidents (
        id, slug, record_type, organisation_id, organisation_display_name, threat_group_id,
        country_code, romania_relationship_basis, country_confidence, incident_date, discovered_date,
        first_observed, last_observed, verification_status, editorial_status, summary, sector,
        independently_confirmed, dedup_key
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)`
    )
    .bind(
      id,
      record.slug,
      record.recordType,
      record.organisationId,
      record.organisationDisplayName,
      record.threatGroupId,
      record.countryCode,
      record.romaniaRelationshipBasis,
      record.countryConfidence,
      record.incidentDate,
      record.discoveredDate,
      record.firstObserved,
      record.lastObserved,
      record.verificationStatus,
      record.editorialStatus,
      record.summary,
      record.sector,
      record.independentlyConfirmed ? 1 : 0,
      record.dedupKey
    )
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO incident_sources (
        id, incident_id, source_id, upstream_record_id, source_url, title, source_publication_date,
        source_payload_hash, authoritative, corroborates_claim, sanitised_metadata
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
    )
    .bind(
      crypto.randomUUID(),
      id,
      record.source.sourceId,
      record.source.upstreamRecordId,
      record.source.sourceUrl,
      record.source.title,
      record.source.sourcePublicationDate,
      record.source.payloadHash,
      record.source.authoritative ? 1 : 0,
      record.source.corroboratesClaim ? 1 : 0,
      JSON.stringify(record.source.sanitisedMetadata)
    )
    .run();

  return 'inserted';
}

export async function persistExposure(db: D1Database, record: NormalisedExposure, nowIso: string): Promise<PersistOutcome> {
  const existing = await db
    .prepare('SELECT id FROM exposures WHERE dedup_key = ?1')
    .bind(record.dedupKey)
    .first<{ id: string }>();

  if (existing) {
    await db.prepare('UPDATE exposures SET updated_at = ?1 WHERE id = ?2').bind(nowIso, existing.id).run();
    return 'updated';
  }

  await db
    .prepare(
      `INSERT INTO exposures (
        id, exposure_type, severity, affected_service_type, hosting_asn, hosting_organisation,
        country_iso_code, sector, observed_month, masked_ip, dedup_key
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
    )
    .bind(
      crypto.randomUUID(),
      record.exposureType,
      record.severity,
      record.affectedServiceType,
      record.hostingAsn,
      record.hostingOrganisation,
      record.countryIsoCode,
      record.sector,
      record.observedMonth,
      record.maskedIp,
      record.dedupKey
    )
    .run();

  return 'inserted';
}

export async function persistIndicator(db: D1Database, record: NormalisedIndicator, nowIso: string): Promise<PersistOutcome> {
  const existing = await db
    .prepare('SELECT id FROM indicators WHERE dedup_key = ?1')
    .bind(record.dedupKey)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare('UPDATE indicators SET last_seen = ?1, active = ?2, updated_at = ?3 WHERE id = ?4')
      .bind(record.lastSeen, record.active ? 1 : 0, nowIso, existing.id)
      .run();
    return 'updated';
  }

  await db
    .prepare(
      `INSERT INTO indicators (
        id, ioc_type, defanged_value, malware_family, threat_type, first_seen, last_seen, active,
        romania_relationship_basis, country_confidence, dedup_key
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
    )
    .bind(
      crypto.randomUUID(),
      record.iocType,
      record.defangedValue,
      record.malwareFamily,
      record.threatType,
      record.firstSeen,
      record.lastSeen,
      record.active ? 1 : 0,
      record.romaniaRelationshipBasis,
      record.countryConfidence,
      record.dedupKey
    )
    .run();

  return 'inserted';
}

export async function persistMalwareMetadata(
  db: D1Database,
  record: NormalisedMalwareMetadata,
  nowIso: string
): Promise<PersistOutcome> {
  const existing = await db
    .prepare('SELECT id FROM malware_metadata WHERE dedup_key = ?1')
    .bind(record.dedupKey)
    .first<{ id: string }>();

  if (existing) {
    await db.prepare('UPDATE malware_metadata SET updated_at = ?1 WHERE id = ?2').bind(nowIso, existing.id).run();
    return 'updated';
  }

  await db
    .prepare(
      `INSERT INTO malware_metadata (
        id, sha256_hash, signature, family, file_type, tags, first_seen, reference_url, dedup_key
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
    )
    .bind(
      crypto.randomUUID(),
      record.sha256Hash,
      record.signature,
      record.family,
      record.fileType,
      JSON.stringify(record.tags),
      record.firstSeen,
      record.referenceUrl,
      record.dedupKey
    )
    .run();

  return 'inserted';
}

export async function persistAggregateStatistic(
  db: D1Database,
  record: NormalisedAggregateStatistic,
  sourceId: string
): Promise<PersistOutcome> {
  const existing = await db
    .prepare('SELECT id FROM aggregate_statistics WHERE dedup_key = ?1')
    .bind(record.dedupKey)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare('UPDATE aggregate_statistics SET metric_value = ?1 WHERE id = ?2')
      .bind(record.metricValue, existing.id)
      .run();
    return 'updated';
  }

  await db
    .prepare(
      `INSERT INTO aggregate_statistics (
        id, dataset, scope, period_label, period_start, period_end, sector, metric_name, metric_value,
        source_id, dedup_key
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
    )
    .bind(
      crypto.randomUUID(),
      record.dataset,
      record.scope,
      record.periodLabel,
      record.periodStart,
      record.periodEnd,
      record.sector,
      record.metricName,
      record.metricValue,
      sourceId,
      record.dedupKey
    )
    .run();

  return 'inserted';
}
