import type { Context } from 'hono';
import type { AppEnv } from '../env';

/** 统一错误响应体 */
export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

/** 取客户端 IP（Cloudflare 优先） */
export function clientIp(c: Context<AppEnv>): string {
  const cfIp = c.req.header('cf-connecting-ip');
  if (cfIp) return cfIp;
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

/** 判断当前请求是否 https（决定 Cookie 是否加 Secure / __Host- 前缀） */
export function isHttps(c: Context<AppEnv>): boolean {
  const proto = c.req.header('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  try {
    return new URL(c.req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** 会话 Cookie 名：https 下用 __Host- 前缀强化隔离 */
export function sessionCookieName(c: Context<AppEnv>): string {
  return isHttps(c) ? '__Host-tnotes_sid' : 'tnotes_sid';
}
