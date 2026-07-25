-- Romania Cyber Monitor: incidents (the canonical public record) and their
-- corroborating sources.

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  record_type TEXT NOT NULL CHECK (record_type IN (
    'ransomware_claim',
    'verified_breach',
    'public_exposure',
    'threat_indicator',
    'malware_distribution',
    'malware_intelligence',
    'aggregate_statistics'
  )),
  organisation_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
  organisation_display_name TEXT,
  threat_group_id TEXT,
  country_code TEXT NOT NULL DEFAULT 'RO',
  romania_relationship_basis TEXT NOT NULL CHECK (romania_relationship_basis IN (
    'source_country_ro',
    'verified_romanian_organisation',
    'verified_organisation_domain',
    'verified_romanian_asn',
    'official_source',
    'manual_editorial_confirmation'
  )),
  country_confidence TEXT NOT NULL CHECK (country_confidence IN ('high', 'medium', 'low')),
  incident_date TEXT,
  discovered_date TEXT,
  first_observed TEXT,
  last_observed TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified_claim' CHECK (verification_status IN (
    'unverified_claim',
    'source_verified',
    'media_corroborated',
    'organisation_confirmed',
    'authority_confirmed',
    'disputed',
    'false_positive'
  )),
  editorial_status TEXT NOT NULL DEFAULT 'candidate' CHECK (editorial_status IN (
    'candidate',
    'needs_review',
    'draft',
    'approved',
    'published',
    'updated',
    'retracted',
    'archived'
  )),
  summary TEXT,
  sector TEXT,
  independently_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (independently_confirmed IN (0, 1)),
  dedup_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  retracted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_dedup_key ON incidents (dedup_key);
CREATE INDEX IF NOT EXISTS idx_incidents_record_type ON incidents (record_type);
CREATE INDEX IF NOT EXISTS idx_incidents_editorial_status ON incidents (editorial_status);
CREATE INDEX IF NOT EXISTS idx_incidents_country_confidence ON incidents (country_confidence);
CREATE INDEX IF NOT EXISTS idx_incidents_organisation ON incidents (organisation_id);
CREATE INDEX IF NOT EXISTS idx_incidents_published_at ON incidents (published_at);

CREATE TABLE IF NOT EXISTS incident_sources (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  upstream_record_id TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  source_publication_date TEXT,
  retrieved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  source_payload_hash TEXT NOT NULL,
  authoritative INTEGER NOT NULL DEFAULT 0 CHECK (authoritative IN (0, 1)),
  corroborates_claim INTEGER NOT NULL DEFAULT 0 CHECK (corroborates_claim IN (0, 1)),
  sanitised_metadata TEXT
);

-- Prevents ingesting the same upstream record twice for the same source.
CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_sources_identity ON incident_sources (source_id, upstream_record_id);
CREATE INDEX IF NOT EXISTS idx_incident_sources_incident ON incident_sources (incident_id);
