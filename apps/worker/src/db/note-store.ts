import type { NoteListItem, NoteMeta, NoteRecord } from '@tnotes/shared';

export interface NoteRow {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  favorited: number;
  notebook_id: string | null;
  tag_ids: string;
  word_count: number;
  attachment_count: number;
  cipher: string;
  iv: string;
  title_cipher: string;
  title_iv: string;
}

const META_COLUMNS =
  'id, created_at, updated_at, deleted_at, favorited, notebook_id, tag_ids, word_count, attachment_count, title_cipher, title_iv';
const FULL_COLUMNS = META_COLUMNS + ', cipher, iv';

function parseTagIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function rowToMeta(row: NoteRow): NoteMeta {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    favorited: row.favorited === 1,
    notebookId: row.notebook_id,
    tagIds: parseTagIds(row.tag_ids),
    wordCount: row.word_count,
    attachmentCount: row.attachment_count,
  };
}

export function rowToListItem(row: NoteRow): NoteListItem {
  return {
    ...rowToMeta(row),
    titleCipher: row.title_cipher,
    titleIv: row.title_iv,
  };
}

export function rowToRecord(row: NoteRow): NoteRecord {
  return {
    ...rowToListItem(row),
    cipher: row.cipher,
    iv: row.iv,
  };
}

export async function listNotes(db: D1Database): Promise<NoteListItem[]> {
  const { results } = await db
    .prepare('SELECT ' + META_COLUMNS + ' FROM notes ORDER BY updated_at DESC')
    .all<NoteRow>();
  return results.map(rowToListItem);
}

export async function listNotesWithContent(db: D1Database): Promise<NoteRecord[]> {
  const { results } = await db
    .prepare('SELECT ' + FULL_COLUMNS + ' FROM notes ORDER BY updated_at DESC')
    .all<NoteRow>();
  return results.map(rowToRecord);
}

export async function getNote(db: D1Database, id: string): Promise<NoteRecord | null> {
  const row = await db
    .prepare('SELECT ' + FULL_COLUMNS + ' FROM notes WHERE id = ?')
    .bind(id)
    .first<NoteRow>();
  return row ? rowToRecord(row) : null;
}
export interface CreateNoteInput {
  id: string;
  cipher: string;
  iv: string;
  titleCipher: string;
  titleIv: string;
  notebookId: string | null;
  tagIds: string[];
  wordCount: number;
  attachmentCount: number;
}

export async function createNote(db: D1Database, input: CreateNoteInput): Promise<NoteRecord> {
  const now = Date.now();
  await db
    .prepare(
      'INSERT INTO notes (id, created_at, updated_at, deleted_at, favorited, notebook_id, tag_ids, word_count, attachment_count, cipher, iv, title_cipher, title_iv) ' +
        'VALUES (?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      input.id,
      now,
      now,
      input.notebookId,
      JSON.stringify(input.tagIds),
      input.wordCount,
      input.attachmentCount,
      input.cipher,
      input.iv,
      input.titleCipher,
      input.titleIv,
    )
    .run();
  return {
    id: input.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    favorited: false,
    notebookId: input.notebookId,
    tagIds: input.tagIds,
    wordCount: input.wordCount,
    attachmentCount: input.attachmentCount,
    cipher: input.cipher,
    iv: input.iv,
    titleCipher: input.titleCipher,
    titleIv: input.titleIv,
  };
}

export interface NotePatch {
  cipher?: string;
  iv?: string;
  titleCipher?: string;
  titleIv?: string;
  notebookId?: string | null;
  tagIds?: string[];
  favorited?: boolean;
  wordCount?: number;
  attachmentCount?: number;
  touch?: boolean;
}

export async function updateNote(db: D1Database, id: string, patch: NotePatch): Promise<boolean> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.cipher !== undefined) {
    sets.push('cipher = ?');
    values.push(patch.cipher);
  }
  if (patch.iv !== undefined) {
    sets.push('iv = ?');
    values.push(patch.iv);
  }
  if (patch.titleCipher !== undefined) {
    sets.push('title_cipher = ?');
    values.push(patch.titleCipher);
  }
  if (patch.titleIv !== undefined) {
    sets.push('title_iv = ?');
    values.push(patch.titleIv);
  }
  if (patch.notebookId !== undefined) {
    sets.push('notebook_id = ?');
    values.push(patch.notebookId);
  }
  if (patch.tagIds !== undefined) {
    sets.push('tag_ids = ?');
    values.push(JSON.stringify(patch.tagIds));
  }
  if (patch.favorited !== undefined) {
    sets.push('favorited = ?');
    values.push(patch.favorited ? 1 : 0);
  }
  if (patch.wordCount !== undefined) {
    sets.push('word_count = ?');
    values.push(patch.wordCount);
  }
  if (patch.attachmentCount !== undefined) {
    sets.push('attachment_count = ?');
    values.push(patch.attachmentCount);
  }
  if (patch.touch !== false) {
    sets.push('updated_at = ?');
    values.push(Date.now());
  }
  if (!sets.length) return true;
  values.push(id);
  const result = await db
    .prepare('UPDATE notes SET ' + sets.join(', ') + ' WHERE id = ?')
    .bind(...values)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function softDeleteNote(db: D1Database, id: string): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .prepare('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function restoreNote(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare('UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ?')
    .bind(Date.now(), id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function purgeNote(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
