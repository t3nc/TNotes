import type { TagRecord } from '@tnotes/shared';

interface TagRow {
  id: string;
  created_at: number;
  cipher: string;
  iv: string;
}

function parseTagIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function listTags(db: D1Database): Promise<TagRecord[]> {
  const { results } = await db
    .prepare('SELECT id, created_at, cipher, iv FROM tags ORDER BY created_at ASC')
    .all<TagRow>();
  return results.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    cipher: row.cipher,
    iv: row.iv,
  }));
}

export async function createTag(
  db: D1Database,
  id: string,
  cipher: string,
  iv: string,
): Promise<TagRecord> {
  const now = Date.now();
  await db
    .prepare('INSERT INTO tags (id, created_at, cipher, iv) VALUES (?, ?, ?, ?)')
    .bind(id, now, cipher, iv)
    .run();
  return { id, createdAt: now, cipher, iv };
}

export async function updateTag(db: D1Database, id: string, cipher: string, iv: string): Promise<boolean> {
  const result = await db
    .prepare('UPDATE tags SET cipher = ?, iv = ? WHERE id = ?')
    .bind(cipher, iv, id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteTag(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
  const { results } = await db.prepare('SELECT id, tag_ids FROM notes').all<{
    id: string;
    tag_ids: string;
  }>();
  const statements: D1PreparedStatement[] = [];
  for (const row of results) {
    const ids = parseTagIds(row.tag_ids);
    if (!ids.includes(id)) continue;
    const next = ids.filter((tagId) => tagId !== id);
    statements.push(
      db.prepare('UPDATE notes SET tag_ids = ? WHERE id = ?').bind(JSON.stringify(next), row.id),
    );
  }
  if (statements.length) await db.batch(statements);
  return (result.meta.changes ?? 0) > 0;
}
