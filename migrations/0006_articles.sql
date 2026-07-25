-- Romania Cyber Monitor: articles (research, incident briefs, weekly reports)
-- and their citations. Draft generation is automatic; publication is never
-- automatic (enforced in application code, not just here).

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  article_type TEXT NOT NULL CHECK (article_type IN (
    'incident_brief',
    'verified_breach_profile',
    'weekly_report',
    'monthly_report',
    'threat_group_profile',
    'sector_analysis',
    'technical_explainer',
    'methodology_update'
  )),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ro')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'in_review', 'approved', 'published', 'retracted'
  )),
  body TEXT NOT NULL,
  related_incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  generated_automatically INTEGER NOT NULL DEFAULT 0 CHECK (generated_automatically IN (0, 1)),
  reviewed_by TEXT,
  approved_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_type ON articles (article_type);
CREATE INDEX IF NOT EXISTS idx_articles_related_incident ON articles (related_incident_id);

CREATE TABLE IF NOT EXISTS article_sources (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  citation_label TEXT NOT NULL,
  source_url TEXT,
  publisher TEXT,
  publication_date TEXT,
  accessed_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  authoritative INTEGER NOT NULL DEFAULT 0 CHECK (authoritative IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_article_sources_article ON article_sources (article_id);
