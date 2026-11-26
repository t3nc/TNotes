import { SESSION_TTL_MS } from '@tnotes/shared';

export interface SessionRow {
  id: string;
  expires_at: number;
}

export async function createSession(
  db: D1Database,
  id: string,
  userAgent: string | null,
): Promise<number> {
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await db
    .prepare('INSERT INTO sessions (id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?)')
    .bind(id, now, expiresAt, userAgent)
    .run();
  return expiresAt;
}

export async function findSession(db: D1Database, id: string): Promise<SessionRow | null> {
  const row = await db
    .prepare('SELECT id, expires_at FROM sessions WHERE id = ?')
    .bind(id)
    .first<SessionRow>();
  return row ?? null;
}

export async function renewSession(db: D1Database, id: string): Promise<void> {
  await db
    .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
    .bind(Date.now() + SESSION_TTL_MS, id)
    .run();
}

export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
}

export async function purgeExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()).run();
}
