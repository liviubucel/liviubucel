-- Romania Cyber Monitor: organisation registry, aliases, verified domains, ASNs
-- These tables are the manually curated backbone of the Romania eligibility
-- engine. Nothing here is populated automatically from upstream feeds.

CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'RO',
  sector TEXT,
  official_website TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN (
    'unverified', 'editor_verified', 'authority_verified'
  )),
  verification_source TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_organisations_canonical_name ON organisations (canonical_name);

CREATE TABLE IF NOT EXISTS organisation_aliases (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalised_alias TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_organisation_aliases_normalised ON organisation_aliases (normalised_alias);
CREATE INDEX IF NOT EXISTS idx_organisation_aliases_org ON organisation_aliases (organisation_id);

CREATE TABLE IF NOT EXISTS organisation_domains (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  verification_source TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organisation_domains_domain ON organisation_domains (domain);
CREATE INDEX IF NOT EXISTS idx_organisation_domains_org ON organisation_domains (organisation_id);

CREATE TABLE IF NOT EXISTS romanian_asns (
  asn INTEGER PRIMARY KEY,
  organisation_name TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  verification_source TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Organisation review queue: candidates that need editorial disambiguation
-- (unknown organisation, conflicting domains, duplicate candidates, name
-- changes, subsidiaries, ambiguous abbreviations).
CREATE TABLE IF NOT EXISTS organisation_review_queue (
  id TEXT PRIMARY KEY,
  raw_name TEXT NOT NULL,
  raw_domain TEXT,
  reason TEXT NOT NULL CHECK (reason IN (
    'unknown_organisation',
    'conflicting_domains',
    'duplicate_candidate',
    'possible_name_change',
    'possible_subsidiary',
    'ambiguous_abbreviation'
  )),
  suggested_organisation_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_organisation_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT
);
