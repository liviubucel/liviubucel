const TOKEN_BYTES = 32;
const TOKEN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function issueToken(db: D1Database, expiresAt: number): Promise<string> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const now = Date.now();

  await db
    .prepare(
      `DELETE FROM cv_download_tokens
       WHERE expires_at < ? OR (consumed_at IS NOT NULL AND consumed_at < ?)`,
    )
    .bind(now, now - TOKEN_RETENTION_MS)
    .run();

  await db
    .prepare(
      `INSERT INTO cv_download_tokens (token_hash, expires_at, consumed_at, created_at)
       VALUES (?, ?, NULL, ?)`,
    )
    .bind(tokenHash, expiresAt, now)
    .run();

  return token;
}

export async function isTokenValid(db: D1Database, token: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  const record = await db
    .prepare(
      `SELECT token_hash
       FROM cv_download_tokens
       WHERE token_hash = ? AND consumed_at IS NULL AND expires_at >= ?
       LIMIT 1`,
    )
    .bind(tokenHash, Date.now())
    .first<{ token_hash: string }>();

  return Boolean(record);
}

export async function consumeToken(db: D1Database, token: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  const now = Date.now();
  const result = await db
    .prepare(
      `UPDATE cv_download_tokens
       SET consumed_at = ?
       WHERE token_hash = ? AND consumed_at IS NULL AND expires_at >= ?`,
    )
    .bind(now, tokenHash, now)
    .run();

  return (result.meta?.changes ?? 0) === 1;
}
