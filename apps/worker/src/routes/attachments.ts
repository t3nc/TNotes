import { Hono } from 'hono';
import { MAX_ATTACHMENT_BYTES, MAX_REQUEST_BYTES, newId } from '@tnotes/shared';
import type { AppEnv } from '../env';
import { clientIp, errorBody } from '../lib/http';
import { bytesToBase64 } from '../lib/base64';
import {
  createAttachment,
  deleteAttachment,
  getAttachment,
  getAttachmentData,
  listAttachmentsByNote,
} from '../db/attachments';
import { rateLimit } from '../middleware/security';

export const attachmentRoutes = new Hono<AppEnv>();

attachmentRoutes.post('/', async (c) => {
  if (!rateLimit('upload:' + clientIp(c), 120, 60 * 1000)) {
    return c.json(errorBody('rate_limited', '上传过于频繁，请稍后再试'), 429);
  }

  const noteId = c.req.header('x-tnotes-note-id') ?? '';
  const mime = c.req.header('x-tnotes-mime') ?? 'image/webp';
  const salt = c.req.header('x-tnotes-salt') ?? '';
  const iv = c.req.header('x-tnotes-iv') ?? '';
  if (!noteId || !salt || !iv) {
    return c.json(errorBody('invalid_body', '缺少附件元信息'), 400);
  }

  const declared = Number(c.req.header('content-length') ?? '0');
  if (declared > MAX_REQUEST_BYTES) {
    return c.json(errorBody('payload_too_large', '附件超出大小限制'), 413);
  }

  const buffer = await c.req.arrayBuffer();
  if (!buffer.byteLength) return c.json(errorBody('empty_body', '附件内容为空'), 400);
  if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
    return c.json(errorBody('payload_too_large', '附件超出 2MB 上限'), 413);
  }

  const attachment = await createAttachment(c.env.DB, {
    id: newId(),
    noteId,
    mime,
    size: buffer.byteLength,
    salt,
    iv,
    data: new Uint8Array(buffer),
  });
  return c.json({ attachment }, 201);
});

attachmentRoutes.get('/', async (c) => {
  const noteId = c.req.query('noteId');
  if (!noteId) return c.json(errorBody('invalid_body', '缺少 noteId'), 400);
  const attachments = await listAttachmentsByNote(c.env.DB, noteId);
  return c.json({ attachments });
});

attachmentRoutes.get('/:id', async (c) => {
  const meta = await getAttachment(c.env.DB, c.req.param('id'));
  if (!meta) return c.json(errorBody('not_found', '附件不存在'), 404);
  const data = await getAttachmentData(c.env.DB, meta.id);
  if (!data) return c.json(errorBody('not_found', '附件内容缺失'), 404);
  return c.json({ attachment: { ...meta, cipher: bytesToBase64(data) } });
});

attachmentRoutes.delete('/:id', async (c) => {
  const ok = await deleteAttachment(c.env.DB, c.req.param('id'));
  if (!ok) return c.json(errorBody('not_found', '附件不存在'), 404);
  return c.json({ ok: true });
});
