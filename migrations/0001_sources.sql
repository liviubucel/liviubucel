-- Romania Cyber Monitor: sources registry
-- Every external data source is registered here so public pages can render
-- attribution, and the sync scheduler can read enabled/health state.

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'ransomware_claim_feed',
    'breach_catalogue',
    'exposure_database',
    'ioc_feed',
    'malware_metadata_repository',
    'osint_aggregator',
    'aggregate_statistics_export'
  )),
  base_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  attribution_text TEXT NOT NULL,
  terms_url TEXT,
  last_success_at TEXT,
  last_failure_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO sources (id, name, source_type, base_url, enabled, attribution_text, terms_url) VALUES
  ('ransomware_live', 'Ransomware.live', 'ransomware_claim_feed', 'https://api.ransomware.live', 1,
   'Threat-actor claim data supplied by Ransomware.live.', 'https://ransomware.live'),
  ('hibp', 'Have I Been Pwned', 'breach_catalogue', 'https://haveibeenpwned.com', 1,
   'Breach catalogue metadata supplied by Have I Been Pwned.', 'https://haveibeenpwned.com/API/v3'),
  ('leakix', 'LeakIX', 'exposure_database', 'https://leakix.net', 0,
   'Public exposure data supplied by LeakIX.', 'https://leakix.net/terms'),
  ('threatfox', 'ThreatFox (abuse.ch)', 'ioc_feed', 'https://threatfox-api.abuse.ch', 0,
   'Indicator-of-compromise data supplied by abuse.ch ThreatFox.', 'https://threatfox.abuse.ch/faq/'),
  ('urlhaus', 'URLhaus (abuse.ch)', 'ioc_feed', 'https://urlhaus-api.abuse.ch', 0,
   'Malware-distribution URL data supplied by abuse.ch URLhaus.', 'https://urlhaus.abuse.ch/api/'),
  ('malwarebazaar', 'MalwareBazaar (abuse.ch)', 'malware_metadata_repository', 'https://mb-api.abuse.ch', 0,
   'Malware sample metadata supplied by abuse.ch MalwareBazaar.', 'https://bazaar.abuse.ch/api/'),
  ('misp', 'MISP public feeds', 'osint_aggregator', 'misp-feeds', 0,
   'OSINT correlation supplied by curated public MISP feeds.', NULL),
  ('enisa_ciras', 'ENISA CIRAS', 'aggregate_statistics_export', 'https://ciras.enisa.europa.eu', 0,
   'Aggregated EU cybersecurity incident statistics supplied by ENISA CIRAS.', 'https://www.enisa.europa.eu/');
