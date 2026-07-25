// Romania Cyber Monitor - D1-backed distributed lock.
// Prevents two overlapping sync runs for the same source. A lock past its
// expiry is safe to steal - it is deleted before every acquisition attempt,
// so a crashed run can never permanently block future runs.

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes - generous relative to guardedFetch's own timeouts/retries

export async function acquireLock(db: D1Database, sourceId: string, owner: string, now: Date): Promise<boolean> {
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS).toISOString();

  // A stale (expired) lock is deleted unconditionally before every attempt,
  // so a crashed/timed-out run can never block future runs forever.
  await db.prepare('DELETE FROM sync_locks WHERE source_id = ?1 AND expires_at < ?2').bind(sourceId, nowIso).run();

  try {
    await db
      .prepare('INSERT INTO sync_locks (source_id, lock_owner, acquired_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(sourceId, owner, nowIso, expiresAt)
      .run();
    return true;
  } catch {
    // Primary-key violation: another run already holds a non-expired lock.
    return false;
  }
}

export async function releaseLock(db: D1Database, sourceId: string, owner: string): Promise<void> {
  await db.prepare('DELETE FROM sync_locks WHERE source_id = ?1 AND lock_owner = ?2').bind(sourceId, owner).run();
}
