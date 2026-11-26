import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { KDF_MINIMUMS, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS } from '@tnotes/shared';
import type { KdfParams } from '@tnotes/shared';
import type { AppEnv } from '../env';
import { clientIp, errorBody } from '../lib/http';
import { randomToken, sha256Base64, timingSafeEqual } from '../lib/crypto';
import { clearSessionCookie, setSessionCookie } from '../lib/cookies';
import { getSettings, saveSettings } from '../db/settings';
import { createSession, deleteSession } from '../db/sessions';
import { rateLimit } from '../middleware/security';
import { requireSession } from '../middleware/session';

export const authRoutes = new Hono<AppEnv>();

function isBase64AtLeast(value: unknown, minBytes: number): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    return atob(value).length >= minBytes;
  } catch {
    return false;
  }
}

function validateKdf(params: unknown): KdfParams | null {
  if (!params || typeof params !== 'object') return null;
  const p = params as Record<string, number | string>;
  if (p.algo !== 'argon2id') return null;
  if (typeof p.memorySize !== 'number' || p.memorySize < KDF_MINIMUMS.memorySize) return null;
  if (typeof p.iterations !== 'number' || p.iterations < KDF_MINIMUMS.iterations) return null;
  if (typeof p.parallelism !== 'number' || p.parallelism < KDF_MINIMUMS.parallelism) return null;
  if (p.hashLength !== 32) return null;
  if (p.saltLength !== 16) return null;
  return {
    algo: 'argon2id',
    memorySize: p.memorySize,
    iterations: p.iterations,
    parallelism: p.parallelism,
    hashLength: 32,
    saltLength: 16,
  };
}

async function countRecentFailures(db: D1Database, ip: string): Promise<number> {
  const cutoff = Date.now() - LOGIN_WINDOW_MS;
  const row = await db
    .prepare('SELECT COUNT(*) AS c FROM login_attempts WHERE ip = ? AND ok = 0 AND created_at > ?')
    .bind(ip, cutoff)
    .first<{ c: number }>();
  return row ? Number(row.c) : 0;
}

authRoutes.get('/state', async (c) => {
  const settings = await getSettings(c.env.DB);
  if (!settings) {
    return c.json({ initialized: false, displayName: null, salt: null, kdfParams: null });
  }
  return c.json({
    initialized: true,
    displayName: settings.displayName,
    salt: settings.salt,
    kdfParams: settings.kdfParams,
  });
});

authRoutes.post('/setup', async (c) => {
  const settings = await getSettings(c.env.DB);
  if (settings) return c.json(errorBody('already_initialized', '笔记库已初始化'), 409);

  const expected = c.env.SETUP_TOKEN;
  if (!expected) {
    return c.json(errorBody('setup_disabled', '服务端未配置初始化令牌，无法首次设置'), 503);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(errorBody('invalid_body', '请求格式错误'), 400);
  const providedToken = String(body.setupToken ?? '').trim();
  if (!timingSafeEqual(providedToken, expected.trim())) {
    return c.json(errorBody('invalid_setup_token', '初始化令牌不正确'), 403);
  }

  const kdfParams = validateKdf(body.kdfParams);
  if (!kdfParams) return c.json(errorBody('invalid_kdf', 'KDF 参数不合法'), 400);
  if (!isBase64AtLeast(body.loginSecret, 32)) {
    return c.json(errorBody('invalid_login_secret', '登录凭据格式错误'), 400);
  }
  if (!isBase64AtLeast(body.salt, 16)) {
    return c.json(errorBody('invalid_salt', 'salt 格式错误'), 400);
  }
  const wrapped = body.wrappedKey as { cipher?: string; iv?: string } | undefined;
  if (!wrapped || typeof wrapped.cipher !== 'string' || typeof wrapped.iv !== 'string') {
    return c.json(errorBody('invalid_wrapped_key', '密钥数据缺失'), 400);
  }

  const displayName =
    typeof body.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim().slice(0, 40)
      : null;

  await saveSettings(c.env.DB, {
    initialized: true,
    displayName,
    salt: String(body.salt),
    kdfParams,
    authHash: await sha256Base64(String(body.loginSecret)),
    wrappedKey: { cipher: wrapped.cipher, iv: wrapped.iv },
    version: 1,
    createdAt: Date.now(),
  });

  const sid = randomToken();
  await createSession(c.env.DB, sid, (c.req.header('user-agent') ?? null));
  setSessionCookie(c, sid);
  return c.json({ ok: true, displayName }, 201);
});

authRoutes.post('/login', async (c) => {
  const ip = clientIp(c);
  if (!rateLimit('login:' + ip, 30, 60 * 1000)) {
    return c.json(errorBody('rate_limited', '尝试过于频繁，请稍后再试'), 429);
  }

  const settings = await getSettings(c.env.DB);
  if (!settings) return c.json(errorBody('not_initialized', '笔记库尚未初始化'), 400);

  const failures = await countRecentFailures(c.env.DB, ip);
  if (failures >= LOGIN_MAX_FAILURES) {
    return c.json(errorBody('rate_limited', '失败次数过多，请 15 分钟后再试'), 429);
  }

  const body = await c.req.json().catch(() => null);
  const loginSecret = body && typeof body.loginSecret === 'string' ? body.loginSecret : '';
  const computed = await sha256Base64(loginSecret);
  const ok = timingSafeEqual(computed, settings.authHash);

  await c.env.DB.prepare('INSERT INTO login_attempts (ip, ok, created_at) VALUES (?, ?, ?)').bind(ip, ok ? 1 : 0, Date.now()).run();

  if (!ok) return c.json(errorBody('invalid_credentials', '密码错误'), 401);

  await c.env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();

  const sid = randomToken();
  await createSession(c.env.DB, sid, (c.req.header('user-agent') ?? null));
  setSessionCookie(c, sid);
  return c.json({
    ok: true,
    displayName: settings.displayName,
    salt: settings.salt,
    kdfParams: settings.kdfParams,
    wrappedKey: settings.wrappedKey,
  });
});

authRoutes.post('/logout', async (c) => {
  const sid = getCookie(c, '__Host-tnotes_sid') || getCookie(c, 'tnotes_sid');
  if (sid) await deleteSession(c.env.DB, sid);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.post('/password', requireSession, async (c) => {
  const settings = await getSettings(c.env.DB);
  if (!settings) return c.json(errorBody('not_initialized', '笔记库尚未初始化'), 400);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json(errorBody('invalid_body', '请求格式错误'), 400);

  const computed = await sha256Base64(String(body.oldLoginSecret ?? ''));
  if (!timingSafeEqual(computed, settings.authHash)) {
    return c.json(errorBody('invalid_credentials', '当前密码不正确'), 401);
  }

  const kdfParams = validateKdf(body.kdfParams);
  if (!kdfParams) return c.json(errorBody('invalid_kdf', 'KDF 参数不合法'), 400);
  if (!isBase64AtLeast(body.newLoginSecret, 32)) {
    return c.json(errorBody('invalid_login_secret', '登录凭据格式错误'), 400);
  }
  if (!isBase64AtLeast(body.salt, 16)) {
    return c.json(errorBody('invalid_salt', 'salt 格式错误'), 400);
  }
  const wrapped = body.wrappedKey as { cipher?: string; iv?: string } | undefined;
  if (!wrapped || typeof wrapped.cipher !== 'string' || typeof wrapped.iv !== 'string') {
    return c.json(errorBody('invalid_wrapped_key', '密钥数据缺失'), 400);
  }

  await saveSettings(c.env.DB, {
    ...settings,
    salt: String(body.salt),
    kdfParams,
    authHash: await sha256Base64(String(body.newLoginSecret)),
    wrappedKey: { cipher: wrapped.cipher, iv: wrapped.iv },
  });

  return c.json({ ok: true });
});


