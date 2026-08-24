CREATE TABLE IF NOT EXISTS cv_download_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cv_download_tokens_expiry
  ON cv_download_tokens (expires_at);

CREATE TABLE IF NOT EXISTS cv_request_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  requested_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cv_request_rate_limits_ip_time
  ON cv_request_rate_limits (ip_hash, requested_at);
