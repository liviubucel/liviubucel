-- Romania Cyber Monitor: newsletter subscribers. Double opt-in (status
-- starts 'pending' until the confirm link is clicked) and a per-subscriber
-- unsubscribe token so every digest email carries a working one-click
-- unsubscribe link with no login required.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  confirm_token TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  confirmed_at TEXT,
  unsubscribed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirm_token ON newsletter_subscribers (confirm_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token ON newsletter_subscribers (unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers (status);
