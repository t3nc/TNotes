import { Hono } from 'hono';
import { newId } from '@tnotes/shared';
import type { AppEnv } from '../env';
import { errorBody } from '../lib/http';
import { createTag, deleteTag, listTags, updateTag } from '../db/tags';

export const tagRoutes = new Hono<AppEnv>();

tagRoutes.get('/', async (c) => {
  const tags = await listTags(c.env.DB);
  return c.json({ tags });
});

tagRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.cipher !== 'string' || typeof body.iv !== 'string') {
    return c.json(errorBody('invalid_body', '请求格式错误'), 400);
  }
  const id = typeof body.id === 'string' && body.id ? body.id : newId();
  const tag = await createTag(c.env.DB, id, body.cipher, body.iv);
  return c.json({ tag }, 201);
});

tagRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.cipher !== 'string' || typeof body.iv !== 'string') {
    return c.json(errorBody('invalid_body', '请求格式错误'), 400);
  }
  const ok = await updateTag(c.env.DB, c.req.param('id'), body.cipher, body.iv);
  if (!ok) return c.json(errorBody('not_found', '标签不存在'), 404);
  return c.json({ ok: true });
});

tagRoutes.delete('/:id', async (c) => {
  const ok = await deleteTag(c.env.DB, c.req.param('id'));
  if (!ok) return c.json(errorBody('not_found', '标签不存在'), 404);
  return c.json({ ok: true });
});
