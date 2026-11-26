import { Hono } from 'hono';
import { newId } from '@tnotes/shared';
import type { AppEnv } from '../env';
import { errorBody } from '../lib/http';
import { createNotebook, deleteNotebook, listNotebooks, updateNotebook } from '../db/notebooks';

export const notebookRoutes = new Hono<AppEnv>();

notebookRoutes.get('/', async (c) => {
  const notebooks = await listNotebooks(c.env.DB);
  return c.json({ notebooks });
});

notebookRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.cipher !== 'string' || typeof body.iv !== 'string') {
    return c.json(errorBody('invalid_body', '请求格式错误'), 400);
  }
  const id = typeof body.id === 'string' && body.id ? body.id : newId();
  const notebook = await createNotebook(c.env.DB, id, body.cipher, body.iv);
  return c.json({ notebook }, 201);
});

notebookRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.cipher !== 'string' || typeof body.iv !== 'string') {
    return c.json(errorBody('invalid_body', '请求格式错误'), 400);
  }
  const ok = await updateNotebook(c.env.DB, c.req.param('id'), body.cipher, body.iv);
  if (!ok) return c.json(errorBody('not_found', '笔记本不存在'), 404);
  return c.json({ ok: true });
});

notebookRoutes.delete('/:id', async (c) => {
  const ok = await deleteNotebook(c.env.DB, c.req.param('id'));
  if (!ok) return c.json(errorBody('not_found', '笔记本不存在'), 404);
  return c.json({ ok: true });
});
