-- Romania Cyber Monitor: ENISA CIRAS aggregate statistics.
-- These are pre-aggregated numbers, never individual incident records.

CREATE TABLE IF NOT EXISTS aggregate_statistics (
  id TEXT PRIMARY KEY,
  dataset TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('romania', 'eu')),
  period_label TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  sector TEXT,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  dedup_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aggregate_statistics_dedup_key ON aggregate_statistics (dedup_key);
CREATE INDEX IF NOT EXISTS idx_aggregate_statistics_scope ON aggregate_statistics (scope);
