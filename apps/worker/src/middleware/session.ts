import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { SESSION_TTL_MS } from '@tnotes/shared';
import type { AppEnv } from '../env';
import { errorBody } from '../lib/http';
import { deleteSession, findSession, renewSession } from '../db/sessions';

export async function requireSession(c: Context<AppEnv>, next: Next) {
  const sid =
    getCookie(c, '__Host-tnotes_sid') ||
    getCookie(c, 'tnotes_sid') ||
    getCookie(c, 'tnotes_sid');
  if (!sid) return c.json(errorBody('unauthorized', '未登录'), 401);

  const row = await findSession(c.env.DB, sid);
  if (!row) return c.json(errorBody('unauthorized', '未登录'), 401);
  if (row.expires_at < Date.now()) {
    await deleteSession(c.env.DB, sid);
    return c.json(errorBody('session_expired', '会话已过期，请重新解锁'), 401);
  }

  c.set('sessionId', row.id);
  if (row.expires_at - Date.now() < SESSION_TTL_MS / 2) {
    await renewSession(c.env.DB, row.id);
  }
  await next();
}
