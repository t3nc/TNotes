import type { NotebookRecord } from '@tnotes/shared';

interface NotebookRow {
  id: string;
  created_at: number;
  cipher: string;
  iv: string;
}

export async function listNotebooks(db: D1Database): Promise<NotebookRecord[]> {
  const { results } = await db
    .prepare('SELECT id, created_at, cipher, iv FROM notebooks ORDER BY created_at ASC')
    .all<NotebookRow>();
  return results.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    cipher: row.cipher,
    iv: row.iv,
  }));
}

export async function createNotebook(
  db: D1Database,
  id: string,
  cipher: string,
  iv: string,
): Promise<NotebookRecord> {
  const now = Date.now();
  await db
    .prepare('INSERT INTO notebooks (id, created_at, cipher, iv) VALUES (?, ?, ?, ?)')
    .bind(id, now, cipher, iv)
    .run();
  return { id, createdAt: now, cipher, iv };
}

export async function updateNotebook(
  db: D1Database,
  id: string,
  cipher: string,
  iv: string,
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE notebooks SET cipher = ?, iv = ? WHERE id = ?')
    .bind(cipher, iv, id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteNotebook(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM notebooks WHERE id = ?').bind(id).run();
  await db.prepare('UPDATE notes SET notebook_id = NULL WHERE notebook_id = ?').bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
