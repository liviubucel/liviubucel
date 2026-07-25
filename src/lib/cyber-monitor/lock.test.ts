import { describe, expect, it } from 'vitest';
import { acquireLock, releaseLock } from './lock';

/** Minimal in-memory fake of the sync_locks table's actual constraints:
 * source_id is a primary key, so a second INSERT for the same still-locked
 * source_id must throw, exactly like real D1/SQLite would. */
function createFakeLockDb() {
  const rows = new Map<string, { lock_owner: string; acquired_at: string; expires_at: string }>();

  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (sql.startsWith('DELETE FROM sync_locks WHERE source_id = ?1 AND expires_at')) {
                const [sourceId, nowIso] = args as [string, string];
                const existing = rows.get(sourceId);
                if (existing && existing.expires_at < nowIso) {
                  rows.delete(sourceId);
                }
                return { success: true };
              }

              if (sql.startsWith('INSERT INTO sync_locks')) {
                const [sourceId, lockOwner, acquiredAt, expiresAt] = args as [string, string, string, string];
                if (rows.has(sourceId)) {
                  throw new Error('UNIQUE constraint failed: sync_locks.source_id');
                }
                rows.set(sourceId, { lock_owner: lockOwner, acquired_at: acquiredAt, expires_at: expiresAt });
                return { success: true };
              }

              if (sql.startsWith('DELETE FROM sync_locks WHERE source_id = ?1 AND lock_owner')) {
                const [sourceId, lockOwner] = args as [string, string];
                const existing = rows.get(sourceId);
                if (existing && existing.lock_owner === lockOwner) {
                  rows.delete(sourceId);
                }
                return { success: true };
              }

              throw new Error(`unexpected SQL in fake lock db: ${sql}`);
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, rows };
}

describe('acquireLock / releaseLock', () => {
  it('acquires a lock when none is held', async () => {
    const { db } = createFakeLockDb();
    const acquired = await acquireLock(db, 'ransomware_live', 'owner-a', new Date('2026-01-01T00:00:00Z'));
    expect(acquired).toBe(true);
  });

  it('refuses a second acquisition while the first lock is still valid', async () => {
    const { db } = createFakeLockDb();
    const now = new Date('2026-01-01T00:00:00Z');

    const first = await acquireLock(db, 'ransomware_live', 'owner-a', now);
    const second = await acquireLock(db, 'ransomware_live', 'owner-b', now);

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('allows a new acquisition once the previous lock has expired', async () => {
    const { db } = createFakeLockDb();
    const t0 = new Date('2026-01-01T00:00:00Z');
    const wellPastExpiry = new Date(t0.getTime() + 10 * 60 * 1000); // 10 minutes later, lock TTL is 5 minutes

    await acquireLock(db, 'ransomware_live', 'owner-a', t0);
    const second = await acquireLock(db, 'ransomware_live', 'owner-b', wellPastExpiry);

    expect(second).toBe(true);
  });

  it('releasing a lock allows immediate re-acquisition by a different owner', async () => {
    const { db } = createFakeLockDb();
    const now = new Date('2026-01-01T00:00:00Z');

    await acquireLock(db, 'ransomware_live', 'owner-a', now);
    await releaseLock(db, 'ransomware_live', 'owner-a');
    const second = await acquireLock(db, 'ransomware_live', 'owner-b', now);

    expect(second).toBe(true);
  });

  it('does not release a lock held by a different owner (no accidental cross-run release)', async () => {
    const { db, rows } = createFakeLockDb();
    const now = new Date('2026-01-01T00:00:00Z');

    await acquireLock(db, 'ransomware_live', 'owner-a', now);
    await releaseLock(db, 'ransomware_live', 'owner-wrong');

    expect(rows.has('ransomware_live')).toBe(true);
  });

  it('locks for different sources are independent', async () => {
    const { db } = createFakeLockDb();
    const now = new Date('2026-01-01T00:00:00Z');

    const a = await acquireLock(db, 'ransomware_live', 'owner-a', now);
    const b = await acquireLock(db, 'hibp', 'owner-a', now);

    expect(a).toBe(true);
    expect(b).toBe(true);
  });
});
