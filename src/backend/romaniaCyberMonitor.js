import wixData from 'wix-data';
import { fetch } from 'wix-fetch';

/**
 * Wix-native Romania Cyber Monitor runtime.
 *
 * This is intentionally parallel to the existing Cloudflare/D1 runtime until
 * shadow validation is complete. It reads source enablement from CyberSources
 * and persists only to Wix CMS collections. No Cloudflare bindings are used.
 *
 * Safety properties preserved from the D1 implementation:
 * - deterministic SHA-256 dedup keys
 * - per-source expiring lock
 * - explicit Romania eligibility gates
 * - public ransomware claims remain labelled unconfirmed
 * - HIBP requires a manually verified OrganisationDomains match
 * - HIBP sensitive records stay needs_review
 * - no ransomware leak-site URLs are stored
 * - disabled/unported sources fail closed
 */

const COLLECTIONS = Object.freeze({
  sources: 'CyberSources',
  incidents: 'CyberIncidents',
  incidentSources: 'IncidentSources',
  organisationDomains: 'OrganisationDomains',
  syncLocks: 'SyncLocks',
  syncRuns: 'SyncRuns',
  sourceHealth: 'SourceHealth',
});

const DATA_OPTIONS = Object.freeze({ suppressAuth: true, suppressHooks: true });
const FIND_OPTIONS = Object.freeze({ suppressAuth: true, suppressHooks: true, consistentRead: true });
const LOCK_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 25_000;

const RANSOMWARE_LIVE_ENDPOINT = 'https://api.ransomware.live/v2/countryvictims/RO';
const HIBP_BREACHES_ENDPOINT = 'https://haveibeenpwned.com/api/v3/breaches';

const JOB_SOURCE_MAP = Object.freeze({
  fast: ['ransomware_live', 'threatfox', 'urlhaus'],
  twelveHourly: ['hibp', 'malwarebazaar'],
  daily: ['hibp', 'leakix', 'misp'],
  weekly: ['enisa_ciras'],
});

class SourceNotConfiguredError extends Error {
  constructor(sourceId, reason) {
    super(`${sourceId}_not_configured:${reason}`);
    this.name = 'SourceNotConfiguredError';
  }
}

function randomId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function computeDedupKey(parts) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('webcrypto_unavailable');
  }
  const normalised = parts.map((part) => String(part ?? '').trim().toLowerCase()).join('|');
  const data = new TextEncoder().encode(normalised);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'incident';
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitiseErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]').slice(0, 500);
}

async function queryOne(collectionId, configure) {
  let query = wixData.query(collectionId).limit(1);
  query = configure(query);
  const result = await query.find(FIND_OPTIONS);
  return result.items?.[0] ?? null;
}

async function getSource(sourceId) {
  return queryOne(COLLECTIONS.sources, (query) => query.eq('sourceId', sourceId));
}

async function acquireLock(sourceId, owner, now) {
  const lockId = (await computeDedupKey(['wix-lock', sourceId])).slice(0, 36);
  const existing = await queryOne(COLLECTIONS.syncLocks, (query) => query.eq('sourceId', sourceId));

  if (existing) {
    const expiresAt = toDate(existing.expiresAt);
    if (expiresAt && expiresAt.getTime() >= now.getTime()) return false;
    await wixData.remove(COLLECTIONS.syncLocks, existing._id, DATA_OPTIONS);
  }

  try {
    await wixData.insert(
      COLLECTIONS.syncLocks,
      {
        _id: lockId,
        sourceId,
        lockOwner: owner,
        acquiredAt: now,
        expiresAt: new Date(now.getTime() + LOCK_TTL_MS),
      },
      DATA_OPTIONS
    );
    return true;
  } catch (error) {
    const text = `${error?.code ?? ''} ${error?.message ?? ''}`;
    if (text.includes('WDE0074') || /already exists/i.test(text)) return false;
    throw error;
  }
}

async function releaseLock(sourceId, owner) {
  const existing = await queryOne(COLLECTIONS.syncLocks, (query) =>
    query.eq('sourceId', sourceId).eq('lockOwner', owner)
  );
  if (existing) {
    await wixData.remove(COLLECTIONS.syncLocks, existing._id, DATA_OPTIONS);
  }
}

async function insertSyncRun(sourceId, triggerType, startedAt) {
  const syncRunId = randomId();
  const item = await wixData.insert(
    COLLECTIONS.syncRuns,
    {
      syncRunId,
      sourceId,
      triggerType,
      startedAt,
      status: 'running',
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
    },
    DATA_OPTIONS
  );
  return { syncRunId, itemId: item._id };
}

async function finishSyncRun(itemId, summary, completedAt, errorMessage) {
  const existing = await queryOne(COLLECTIONS.syncRuns, (query) => query.eq('_id', itemId));
  if (!existing) return;
  await wixData.save(
    COLLECTIONS.syncRuns,
    {
      ...existing,
      completedAt,
      status: summary.status === 'skipped_not_configured' ? 'failed' : summary.status,
      recordsReceived: summary.recordsReceived,
      recordsAccepted: summary.recordsAccepted,
      recordsRejected: summary.recordsRejected,
      recordsInserted: summary.recordsInserted,
      recordsUpdated: summary.recordsUpdated,
      errorCode: summary.errorCode,
      sanitisedErrorMessage: errorMessage,
    },
    DATA_OPTIONS
  );
}

async function updateSourceHealth(sourceId, status, now, errorCode = null) {
  const isSuccess = status === 'success' || status === 'partial';
  const existing = await queryOne(COLLECTIONS.sourceHealth, (query) => query.eq('sourceId', sourceId));
  const consecutiveFailures = isSuccess ? 0 : Number(existing?.consecutiveFailures ?? 0) + 1;

  await wixData.save(
    COLLECTIONS.sourceHealth,
    {
      ...(existing ?? {}),
      sourceId,
      lastSuccessAt: isSuccess ? now : existing?.lastSuccessAt ?? null,
      lastFailureAt: isSuccess ? existing?.lastFailureAt ?? null : now,
      consecutiveFailures,
      updatedAt: now,
      lastSchemaValidationFailures: errorCode === 'schema_validation' ? 1 : 0,
    },
    DATA_OPTIONS
  );

  const source = await getSource(sourceId);
  if (source) {
    await wixData.save(
      COLLECTIONS.sources,
      {
        ...source,
        lastSuccessAt: isSuccess ? now : source.lastSuccessAt ?? null,
        lastFailureAt: isSuccess ? source.lastFailureAt ?? null : now,
      },
      DATA_OPTIONS
    );
  }
}

async function fetchJson(url, headers = {}) {
  let timeoutHandle;
  try {
    const timeout = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('fetch_timeout')), FETCH_TIMEOUT_MS);
    });
    const response = await Promise.race([
      fetch(url, { method: 'get', headers }),
      timeout,
    ]);
    if (!response?.ok) throw new Error(`http_${response?.status ?? 'unknown'}`);
    const text = await response.text();
    return JSON.parse(text);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function isRansomwareLiveRecord(record) {
  return Boolean(record && typeof record === 'object');
}

async function fetchRansomwareLive() {
  const parsed = await fetchJson(RANSOMWARE_LIVE_ENDPOINT, {
    Accept: 'application/json',
    'User-Agent': 'RomaniaCyberMonitor/1.0 (+https://www.liviubucel.com/romania-cyber-monitor)',
  });
  if (!Array.isArray(parsed)) throw new Error('ransomware_live_unexpected_shape:not_an_array');
  return parsed;
}

async function normaliseRansomwareLive(record) {
  const organisationName = firstNonEmpty(record.victim, record.post_title, record.victim_name);
  const threatGroup = firstNonEmpty(record.group_name, record.group);
  if (!organisationName || !threatGroup) return null;

  const sourceCountry = firstNonEmpty(record.country) ?? 'RO';
  if (sourceCountry.toUpperCase() !== 'RO') return null;

  const discoveredDate = firstNonEmpty(record.discovered, record.published);
  const dedupKey = await computeDedupKey(['ransomware_live', organisationName, threatGroup, discoveredDate]);

  return {
    slug: `${slugify(organisationName)}-${slugify(threatGroup)}-${dedupKey.slice(0, 8)}`,
    recordType: 'ransomware_claim',
    organisationId: null,
    organisationDisplayName: organisationName,
    threatGroupId: slugify(threatGroup),
    countryCode: 'RO',
    romaniaRelationshipBasis: 'source_country_ro',
    countryConfidence: 'high',
    incidentDate: firstNonEmpty(record.attackdate),
    discoveredDate,
    firstObserved: discoveredDate,
    lastObserved: discoveredDate,
    verificationStatus: 'unverified_claim',
    editorialStatus: 'published',
    summary:
      `${threatGroup} listed ${organisationName} on a data-leak site monitored by public ransomware intelligence sources ` +
      `${discoveredDate ? `on ${discoveredDate}` : 'on an undated entry'}. This records a public claim and does not by itself ` +
      `prove that the organisation was compromised or that the threat actor's statements are accurate.`,
    sector: firstNonEmpty(record.sector, record.activity),
    independentlyConfirmed: false,
    dedupKey,
    source: {
      sourceId: 'ransomware_live',
      upstreamRecordId: dedupKey,
      sourceUrl: null,
      title: `${organisationName} listed by ${threatGroup}`,
      sourcePublicationDate: discoveredDate,
      payloadHash: dedupKey,
      authoritative: false,
      corroboratesClaim: true,
      sanitisedMetadata: { sector: firstNonEmpty(record.sector, record.activity) },
    },
  };
}

function isHibpRecord(record) {
  return Boolean(
    record &&
      typeof record === 'object' &&
      typeof record.Name === 'string' &&
      typeof record.Title === 'string' &&
      typeof record.BreachDate === 'string' &&
      typeof record.AddedDate === 'string' &&
      typeof record.ModifiedDate === 'string'
  );
}

async function fetchHibp() {
  const parsed = await fetchJson(HIBP_BREACHES_ENDPOINT, {
    Accept: 'application/json',
    'User-Agent': 'RomaniaCyberMonitor/1.0 (+https://www.liviubucel.com/romania-cyber-monitor; contact@liviubucel.com)',
  });
  if (!Array.isArray(parsed)) throw new Error('hibp_unexpected_shape:not_an_array');
  return parsed;
}

async function findVerifiedOrganisationDomainMatch(domain) {
  if (!domain) return null;
  const match = await queryOne(COLLECTIONS.organisationDomains, (query) =>
    query.eq('domain', domain.toLowerCase()).eq('verified', true)
  );
  return match?.organisationId ?? null;
}

async function normaliseHibp(record) {
  const domain = String(record.Domain ?? '').trim().toLowerCase();
  const organisationId = await findVerifiedOrganisationDomainMatch(domain);
  if (!organisationId) return null;

  const dedupKey = await computeDedupKey(['hibp', record.Name]);
  const description = stripHtml(record.Description ?? '');
  const verified = record.IsVerified === true;
  const sensitive = record.IsSensitive === true;
  const summary = [
    `${record.Title} was added to the Have I Been Pwned breach catalogue on ${record.AddedDate}, with an alleged breach date of ${record.BreachDate}.`,
    verified
      ? 'This breach is marked as verified within the Have I Been Pwned catalogue.'
      : 'This breach is marked as unverified within the Have I Been Pwned catalogue and has not been independently corroborated.',
    'This verification reflects Have I Been Pwned’s own catalogue process, not confirmation by a Romanian authority.',
    description,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    slug: `${slugify(record.Title)}-${dedupKey.slice(0, 8)}`,
    recordType: 'verified_breach',
    organisationId,
    organisationDisplayName: record.Title,
    threatGroupId: null,
    countryCode: 'RO',
    romaniaRelationshipBasis: 'verified_organisation_domain',
    countryConfidence: 'high',
    incidentDate: record.BreachDate,
    discoveredDate: record.AddedDate,
    firstObserved: record.AddedDate,
    lastObserved: record.ModifiedDate,
    verificationStatus: verified ? 'source_verified' : 'unverified_claim',
    editorialStatus: sensitive ? 'needs_review' : 'published',
    summary,
    sector: null,
    independentlyConfirmed: false,
    dedupKey,
    source: {
      sourceId: 'hibp',
      upstreamRecordId: record.Name,
      sourceUrl: 'https://haveibeenpwned.com/PwnedWebsites',
      title: record.Title,
      sourcePublicationDate: record.BreachDate,
      payloadHash: dedupKey,
      authoritative: false,
      corroboratesClaim: false,
      sanitisedMetadata: {
        domain: record.Domain ?? '',
        pwnCount: Number(record.PwnCount ?? 0),
        dataClasses: Array.isArray(record.DataClasses) ? record.DataClasses : [],
        isVerified: verified,
        isFabricated: record.IsFabricated === true,
        isSensitive: sensitive,
        isRetired: record.IsRetired === true,
        isSpamList: record.IsSpamList === true,
      },
    },
  };
}

async function persistIncident(record, now) {
  const existing = await queryOne(COLLECTIONS.incidents, (query) => query.eq('dedupKey', record.dedupKey));
  let incidentId;
  let outcome;
  let newlyPublished = false;

  if (existing) {
    incidentId = existing.incidentId || existing._id;
    await wixData.save(
      COLLECTIONS.incidents,
      {
        ...existing,
        lastObserved: toDate(record.lastObserved) ?? existing.lastObserved ?? null,
        updatedAt: now,
      },
      DATA_OPTIONS
    );
    outcome = 'updated';
  } else {
    incidentId = randomId();
    const publishedAt = record.editorialStatus === 'published' ? now : null;
    await wixData.insert(
      COLLECTIONS.incidents,
      {
        incidentId,
        slug: record.slug,
        recordType: record.recordType,
        organisationId: record.organisationId,
        organisationDisplayName: record.organisationDisplayName,
        threatGroupId: record.threatGroupId,
        countryCode: record.countryCode,
        romaniaRelationshipBasis: record.romaniaRelationshipBasis,
        countryConfidence: record.countryConfidence,
        incidentDate: toDate(record.incidentDate),
        discoveredDate: toDate(record.discoveredDate),
        firstObserved: toDate(record.firstObserved),
        lastObserved: toDate(record.lastObserved),
        verificationStatus: record.verificationStatus,
        editorialStatus: record.editorialStatus,
        summary: record.summary,
        sector: record.sector,
        independentlyConfirmed: record.independentlyConfirmed,
        dedupKey: record.dedupKey,
        createdAt: now,
        updatedAt: now,
        publishedAt,
        retractedAt: null,
      },
      DATA_OPTIONS
    );
    outcome = 'inserted';
    newlyPublished = record.editorialStatus === 'published';
  }

  const existingSource = await queryOne(COLLECTIONS.incidentSources, (query) =>
    query
      .eq('incidentId', incidentId)
      .eq('sourceId', record.source.sourceId)
      .eq('upstreamRecordId', record.source.upstreamRecordId)
  );

  if (!existingSource) {
    await wixData.insert(
      COLLECTIONS.incidentSources,
      {
        sourceRecordId: randomId(),
        incidentId,
        sourceId: record.source.sourceId,
        upstreamRecordId: record.source.upstreamRecordId,
        sourceUrl: record.source.sourceUrl,
        title: record.source.title,
        sourcePublicationDate: toDate(record.source.sourcePublicationDate),
        retrievedAt: now,
        sourcePayloadHash: record.source.payloadHash,
        authoritative: record.source.authoritative,
        corroboratesClaim: record.source.corroboratesClaim,
        sanitisedMetadata: record.source.sanitisedMetadata,
      },
      DATA_OPTIONS
    );
  }

  return { outcome, incidentId, newlyPublished };
}

async function loadAndNormalise(sourceId) {
  switch (sourceId) {
    case 'ransomware_live': {
      const raw = await fetchRansomwareLive();
      return { raw, validate: isRansomwareLiveRecord, normalise: normaliseRansomwareLive };
    }
    case 'hibp': {
      const raw = await fetchHibp();
      return { raw, validate: isHibpRecord, normalise: normaliseHibp };
    }
    default:
      throw new SourceNotConfiguredError(sourceId, 'adapter_not_ported_to_wix_yet');
  }
}

async function runSource(sourceId, triggerType = 'cron') {
  const source = await getSource(sourceId);
  if (!source || source.enabled !== true) {
    return {
      sourceId,
      status: 'skipped_not_configured',
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      errorCode: 'disabled',
    };
  }

  const owner = randomId();
  const startedAt = new Date();
  const locked = await acquireLock(sourceId, owner, startedAt);
  if (!locked) {
    return {
      sourceId,
      status: 'skipped_locked',
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      errorCode: null,
    };
  }

  const syncRun = await insertSyncRun(sourceId, triggerType, startedAt);
  let recordsReceived = 0;
  let recordsAccepted = 0;
  let recordsRejected = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  let status = 'success';
  let errorCode = null;
  let errorMessage = null;

  try {
    const pipeline = await loadAndNormalise(sourceId);
    recordsReceived = pipeline.raw.length;

    for (const rawRecord of pipeline.raw) {
      if (!pipeline.validate(rawRecord)) {
        recordsRejected += 1;
        continue;
      }

      recordsAccepted += 1;
      try {
        const normalised = await pipeline.normalise(rawRecord);
        if (!normalised) continue;
        const persisted = await persistIncident(normalised, new Date());
        if (persisted.outcome === 'inserted') recordsInserted += 1;
        else recordsUpdated += 1;
      } catch (error) {
        console.error(`[cyber-monitor] ${sourceId} record rejected: ${sanitiseErrorMessage(error)}`);
        recordsRejected += 1;
      }
    }

    if (recordsRejected > 0 && recordsAccepted > 0) status = 'partial';
  } catch (error) {
    if (error instanceof SourceNotConfiguredError) {
      status = 'skipped_not_configured';
      errorCode = 'not_configured';
    } else {
      status = 'failed';
      errorCode = 'fetch_or_process_error';
    }
    errorMessage = sanitiseErrorMessage(error);
  } finally {
    const completedAt = new Date();
    const summary = {
      sourceId,
      status,
      recordsReceived,
      recordsAccepted,
      recordsRejected,
      recordsInserted,
      recordsUpdated,
      errorCode,
    };

    try {
      await finishSyncRun(syncRun.itemId, summary, completedAt, errorMessage);
      await updateSourceHealth(sourceId, status, completedAt, errorCode);
    } finally {
      await releaseLock(sourceId, owner);
    }
  }

  return {
    sourceId,
    status,
    recordsReceived,
    recordsAccepted,
    recordsRejected,
    recordsInserted,
    recordsUpdated,
    errorCode,
  };
}

async function runSources(sourceIds, label) {
  const results = [];
  for (const sourceId of sourceIds) {
    try {
      results.push(await runSource(sourceId, 'cron'));
    } catch (error) {
      results.push({
        sourceId,
        status: 'failed',
        recordsReceived: 0,
        recordsAccepted: 0,
        recordsRejected: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        errorCode: sanitiseErrorMessage(error),
      });
    }
  }
  console.log(JSON.stringify({ event: 'wix_cyber_monitor_job_completed', job: label, results }));
  return results;
}

export async function runFastFeeds() {
  return runSources(JOB_SOURCE_MAP.fast, 'fast');
}

export async function runTwelveHourlyFeeds() {
  return runSources(JOB_SOURCE_MAP.twelveHourly, 'twelveHourly');
}

export async function runDailyFeeds() {
  return runSources(JOB_SOURCE_MAP.daily, 'daily');
}

export async function runWeeklyFeeds() {
  return runSources(JOB_SOURCE_MAP.weekly, 'weekly');
}

/** Manual entry point for Wix backend testing. Safe source IDs only. */
export async function runCyberMonitorSource(sourceId) {
  const allowed = Object.values(JOB_SOURCE_MAP).flat();
  if (!allowed.includes(sourceId)) throw new Error('unsupported_source_id');
  return runSource(sourceId, 'manual');
}
