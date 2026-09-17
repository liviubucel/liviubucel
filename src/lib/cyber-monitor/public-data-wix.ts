import type { RecordType } from './types';
import { wixPublicClient } from '../wix/client';

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

export interface ListIncidentsOptions {
  recordType?: RecordType;
  limit?: number;
  offset?: number;
  lang?: 'en' | 'ro';
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

export interface PublicExposureRow {
  exposureType: string;
  severity: string | null;
  affectedServiceType: string | null;
  hostingOrganisation: string | null;
  countryIsoCode: string | null;
  sector: string | null;
  observedMonth: string;
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

export interface PublicMalwareRow {
  sha256Hash: string;
  signature: string | null;
  family: string | null;
  fileType: string | null;
  firstSeen: string | null;
  referenceUrl: string | null;
}

type UnknownRecord = Record<string, unknown>;

function unwrapDataItem(item: unknown): UnknownRecord {
  if (!item || typeof item !== 'object') return {};
  const record = item as UnknownRecord;
  const data = record.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { ...record, ...(data as UnknownRecord) };
  }
  return record;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function asIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  if (typeof value === 'object' && '$date' in (value as UnknownRecord)) {
    return asIso((value as UnknownRecord).$date);
  }
  return null;
}

function recencyValue(item: UnknownRecord): number {
  const candidate =
    asIso(item.discoveredDate) ?? asIso(item.incidentDate) ?? asIso(item.publishedAt) ?? '1970-01-01T00:00:00.000Z';
  const timestamp = new Date(candidate).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function fetchCollection(collectionId: string, maxItems = 1000): Promise<UnknownRecord[]> {
  const firstPage = await wixPublicClient.items.query(collectionId).limit(Math.min(maxItems, 1000)).find();
  const collected = (firstPage.items ?? []).map(unwrapDataItem);

  // The SDK query builder exposes next()/hasNext() on paged results. Keep the
  // loop defensive so a future response-shape change fails closed instead of
  // issuing unbounded requests.
  let page: unknown = firstPage;
  while (
    collected.length < maxItems &&
    page &&
    typeof page === 'object' &&
    typeof (page as { hasNext?: () => boolean }).hasNext === 'function' &&
    (page as { hasNext: () => boolean }).hasNext() &&
    typeof (page as { next?: () => Promise<unknown> }).next === 'function'
  ) {
    // eslint-disable-next-line no-await-in-loop
    page = await (page as { next: () => Promise<unknown> }).next();
    const items = (page as { items?: unknown[] }).items ?? [];
    collected.push(...items.map(unwrapDataItem));
  }

  return collected.slice(0, maxItems);
}

function isPublishedIncident(item: UnknownRecord): boolean {
  return item.editorialStatus === 'published' || item.editorialStatus === 'updated';
}

function mapIncident(item: UnknownRecord): PublicIncidentRow {
  const publishedAt =
    asIso(item.publishedAt) ?? asIso(item.discoveredDate) ?? asIso(item.incidentDate) ?? new Date(0).toISOString();

  return {
    id: asString(item.incidentId) ?? asString(item._id) ?? '',
    slug: asString(item.slug) ?? '',
    recordType: (asString(item.recordType) ?? 'ransomware_claim') as RecordType,
    organisationDisplayName: asString(item.organisationDisplayName),
    threatGroupId: asString(item.threatGroupId),
    countryConfidence: (asString(item.countryConfidence) ?? 'low') as 'high' | 'medium' | 'low',
    incidentDate: asIso(item.incidentDate),
    discoveredDate: asIso(item.discoveredDate),
    verificationStatus: asString(item.verificationStatus) ?? 'unverified_claim',
    summary: asString(item.summary),
    sector: asString(item.sector),
    publishedAt,
    // Generated Cyber Monitor article content is moving to Wix Blog in a
    // later wave. Until then the public page intentionally falls back to the
    // incident name + summary rather than reading the legacy D1 articles table.
    articleTitle: null,
    articleExcerpt: null,
  };
}

async function allPublishedIncidents(recordType?: RecordType): Promise<UnknownRecord[]> {
  const items = await fetchCollection('CyberIncidents');
  return items
    .filter(isPublishedIncident)
    .filter((item) => !recordType || item.recordType === recordType)
    .sort((a, b) => recencyValue(b) - recencyValue(a));
}

export async function listPublicIncidents({
  recordType,
  limit = 20,
  offset = 0,
}: ListIncidentsOptions = {}): Promise<PublicIncidentRow[]> {
  const incidents = await allPublishedIncidents(recordType);
  return incidents.slice(offset, offset + limit).map(mapIncident);
}

export async function countPublicIncidents(recordType?: RecordType): Promise<number> {
  return (await allPublishedIncidents(recordType)).length;
}

export async function getPublicIncidentBySlug(
  slug: string,
  lang: 'en' | 'ro' = 'en'
): Promise<PublicIncidentDetail | null> {
  const incidents = await allPublishedIncidents();
  const incident = incidents.find((item) => item.slug === slug);
  if (!incident) return null;

  const id = asString(incident.incidentId) ?? asString(incident._id) ?? '';
  const sourceItems = (await fetchCollection('IncidentSources'))
    .filter((item) => item.incidentId === id)
    .sort((a, b) => {
      const aDate = asIso(a.retrievedAt) ?? '1970-01-01T00:00:00.000Z';
      const bDate = asIso(b.retrievedAt) ?? '1970-01-01T00:00:00.000Z';
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

  return {
    ...mapIncident(incident),
    articleBody: null,
    articleLanguage: lang,
    sources: sourceItems.map((source) => ({
      sourceId: asString(source.sourceId) ?? 'unknown',
      title: asString(source.title),
      sourceUrl: asString(source.sourceUrl),
      sourcePublicationDate: asIso(source.sourcePublicationDate),
      authoritative: asBoolean(source.authoritative),
    })),
  };
}

export async function listPublicExposures(limit = 50): Promise<PublicExposureRow[]> {
  const rows = await fetchCollection('CyberExposures');
  return rows
    .sort((a, b) => {
      const monthA = asString(a.observedMonth) ?? '';
      const monthB = asString(b.observedMonth) ?? '';
      if (monthA !== monthB) return monthB.localeCompare(monthA);
      return (asIso(b.createdAt) ?? '').localeCompare(asIso(a.createdAt) ?? '');
    })
    .slice(0, limit)
    .map((row) => ({
      exposureType: asString(row.exposureType) ?? 'unknown',
      severity: asString(row.severity),
      affectedServiceType: asString(row.affectedServiceType),
      hostingOrganisation: asString(row.hostingOrganisation),
      countryIsoCode: asString(row.countryIsoCode),
      sector: asString(row.sector),
      observedMonth: asString(row.observedMonth) ?? '',
    }));
}

export async function listPublicIndicators(limit = 50): Promise<PublicIndicatorRow[]> {
  const rows = await fetchCollection('ThreatIndicators');
  return rows
    .filter((row) => asBoolean(row.active))
    .sort((a, b) => (asIso(b.lastSeen) ?? '').localeCompare(asIso(a.lastSeen) ?? ''))
    .slice(0, limit)
    .map((row) => ({
      iocType: asString(row.iocType) ?? 'unknown',
      defangedValue: asString(row.defangedValue) ?? '',
      malwareFamily: asString(row.malwareFamily),
      threatType: asString(row.threatType),
      firstSeen: asIso(row.firstSeen),
      lastSeen: asIso(row.lastSeen),
      active: true,
    }));
}

export async function listPublicMalwareMetadata(limit = 50): Promise<PublicMalwareRow[]> {
  const rows = await fetchCollection('MalwareIntelligence');
  return rows
    .sort((a, b) => (asIso(b.firstSeen) ?? '').localeCompare(asIso(a.firstSeen) ?? ''))
    .slice(0, limit)
    .map((row) => ({
      sha256Hash: asString(row.sha256Hash) ?? '',
      signature: asString(row.signature),
      family: asString(row.family),
      fileType: asString(row.fileType),
      firstSeen: asIso(row.firstSeen),
      referenceUrl: asString(row.referenceUrl),
    }));
}
