import { ATTACHMENT_CHUNK_BYTES } from '@tnotes/shared';
import type { AttachmentMeta } from '@tnotes/shared';

interface AttachmentRow {
  id: string;
  note_id: string;
  mime: string;
  size: number;
  salt: string;
  iv: string;
  chunk_count: number;
  created_at: number;
}

function rowToMeta(row: AttachmentRow): AttachmentMeta {
  return {
    id: row.id,
    noteId: row.note_id,
    mime: row.mime,
    size: row.size,
    salt: row.salt,
    iv: row.iv,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
  };
}

export async function createAttachment(
  db: D1Database,
  input: {
    id: string;
    noteId: string;
    mime: string;
    size: number;
    salt: string;
    iv: string;
    data: Uint8Array;
  },
): Promise<AttachmentMeta> {
  const chunkCount = Math.max(1, Math.ceil(input.data.length / ATTACHMENT_CHUNK_BYTES));
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        'INSERT INTO attachments (id, note_id, mime, size, salt, iv, chunk_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(input.id, input.noteId, input.mime, input.size, input.salt, input.iv, chunkCount, Date.now()),
  ];
  for (let i = 0; i < chunkCount; i += 1) {
    const start = i * ATTACHMENT_CHUNK_BYTES;
    const slice = input.data.subarray(start, Math.min(start + ATTACHMENT_CHUNK_BYTES, input.data.length));
    statements.push(
      db
        .prepare('INSERT INTO attachment_chunks (attachment_id, idx, data) VALUES (?, ?, ?)')
        .bind(input.id, i, slice),
    );
  }
  await db.batch(statements);
  return {
    id: input.id,
    noteId: input.noteId,
    mime: input.mime,
    size: input.size,
    salt: input.salt,
    iv: input.iv,
    chunkCount,
    createdAt: Date.now(),
  };
}

export async function listAttachmentsByNote(db: D1Database, noteId: string): Promise<AttachmentMeta[]> {
  const { results } = await db
    .prepare(
      'SELECT id, note_id, mime, size, salt, iv, chunk_count, created_at FROM attachments WHERE note_id = ? ORDER BY created_at ASC',
    )
    .bind(noteId)
    .all<AttachmentRow>();
  return results.map(rowToMeta);
}

export async function getAttachment(db: D1Database, id: string): Promise<AttachmentMeta | null> {
  const row = await db
    .prepare(
      'SELECT id, note_id, mime, size, salt, iv, chunk_count, created_at FROM attachments WHERE id = ?',
    )
    .bind(id)
    .first<AttachmentRow>();
  return row ? rowToMeta(row) : null;
}

function toBytes(value: unknown): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  if (Array.isArray(value)) return new Uint8Array(value);
  return new Uint8Array(0);
}

export async function getAttachmentData(db: D1Database, id: string): Promise<Uint8Array | null> {
  const { results } = await db
    .prepare('SELECT data FROM attachment_chunks WHERE attachment_id = ? ORDER BY idx ASC')
    .bind(id)
    .all<{ data: unknown }>();
  if (!results.length) return null;
  const chunks = results.map((row) => toBytes(row.data));
  let total = 0;
  for (const chunk of chunks) total += chunk.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function deleteAttachment(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run();
  await db.prepare('DELETE FROM attachment_chunks WHERE attachment_id = ?').bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteAttachmentsByNote(db: D1Database, noteId: string): Promise<void> {
  const { results } = await db
    .prepare('SELECT id FROM attachments WHERE note_id = ?')
    .bind(noteId)
    .all<{ id: string }>();
  if (!results.length) return;
  const statements: D1PreparedStatement[] = [];
  for (const row of results) {
    statements.push(db.prepare('DELETE FROM attachment_chunks WHERE attachment_id = ?').bind(row.id));
    statements.push(db.prepare('DELETE FROM attachments WHERE id = ?').bind(row.id));
  }
  await db.batch(statements);
}
