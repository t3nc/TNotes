import { Hono } from 'hono';
import { newId } from '@tnotes/shared';
import type { AppEnv } from '../env';
import { errorBody } from '../lib/http';
import {
  createNote,
  getNote,
  listNotes,
  listNotesWithContent,
  purgeNote,
  restoreNote,
  softDeleteNote,
  updateNote,
} from '../db/note-store';
import type { NotePatch } from '../db/note-store';
import { deleteAttachmentsByNote } from '../db/attachments';

export const noteRoutes = new Hono<AppEnv>();

noteRoutes.get('/', async (c) => {
  const includeContent = c.req.query('include') === 'content';
  const notes = includeContent ? await listNotesWithContent(c.env.DB) : await listNotes(c.env.DB);
  return c.json({ notes });
});

noteRoutes.get('/:id', async (c) => {
  const note = await getNote(c.env.DB, c.req.param('id'));
  if (!note) return c.json(errorBody('not_found', '笔记不存在'), 404);
  return c.json({ note });
});

noteRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.cipher !== 'string' || typeof body.iv !== 'string') {
    return c.json(errorBody('invalid_body', '请求格式错误'), 400);
  }
  const id = typeof body.id === 'string' && body.id ? body.id : newId();
  const note = await createNote(c.env.DB, {
    id,
    cipher: body.cipher,
    iv: body.iv,
    titleCipher: typeof body.titleCipher === 'string' ? body.titleCipher : '',
    titleIv: typeof body.titleIv === 'string' ? body.titleIv : '',
    notebookId: typeof body.notebookId === 'string' ? body.notebookId : null,
    tagIds: Array.isArray(body.tagIds)
      ? body.tagIds.filter((v: unknown) => typeof v === 'string')
      : [],
    wordCount: Number(body.wordCount) || 0,
    attachmentCount: Number(body.attachmentCount) || 0,
  });
  return c.json({ note }, 201);
});

noteRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(errorBody('invalid_body', '请求格式错误'), 400);

  const patch: NotePatch = {};
  if (typeof body.cipher === 'string') patch.cipher = body.cipher;
  if (typeof body.iv === 'string') patch.iv = body.iv;
  if (typeof body.titleCipher === 'string') patch.titleCipher = body.titleCipher;
  if (typeof body.titleIv === 'string') patch.titleIv = body.titleIv;
  if (body.notebookId === null || typeof body.notebookId === 'string') {
    patch.notebookId = body.notebookId ?? null;
  }
  if (Array.isArray(body.tagIds)) {
    patch.tagIds = body.tagIds.filter((v: unknown) => typeof v === 'string');
  }
  if (typeof body.favorited === 'boolean') patch.favorited = body.favorited;
  if (typeof body.wordCount === 'number') patch.wordCount = body.wordCount;
  if (typeof body.attachmentCount === 'number') patch.attachmentCount = body.attachmentCount;
  if (body.touch === false) patch.touch = false;

  const ok = await updateNote(c.env.DB, c.req.param('id'), patch);
  if (!ok) return c.json(errorBody('not_found', '笔记不存在'), 404);
  return c.json({ ok: true });
});

noteRoutes.post('/:id/restore', async (c) => {
  const ok = await restoreNote(c.env.DB, c.req.param('id'));
  if (!ok) return c.json(errorBody('not_found', '笔记不存在'), 404);
  return c.json({ ok: true });
});

noteRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  if (c.req.query('permanent') === '1') {
    await deleteAttachmentsByNote(c.env.DB, id);
    const ok = await purgeNote(c.env.DB, id);
    if (!ok) return c.json(errorBody('not_found', '笔记不存在'), 404);
    return c.json({ ok: true, permanent: true });
  }
  const ok = await softDeleteNote(c.env.DB, id);
  if (!ok) return c.json(errorBody('not_found', '笔记不存在'), 404);
  return c.json({ ok: true });
});
