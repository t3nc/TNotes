import type { Context } from 'hono';
import type { AppEnv } from '../env';
import { SESSION_TTL_MS } from '@tnotes/shared';
import { isHttps } from './http';

export function setSessionCookie(c: Context<AppEnv>, sid: string): void {
  const secure = isHttps(c);
  const name = secure ? '__Host-tnotes_sid' : 'tnotes_sid';
  const parts = [
    name + '=' + sid,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + Math.floor(SESSION_TTL_MS / 1000),
  ];
  if (secure) parts.push('Secure');
  c.header('Set-Cookie', parts.join('; '), { append: true });
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  const secure = isHttps(c);
  const name = secure ? '__Host-tnotes_sid' : 'tnotes_sid';
  const parts = [name + '=;', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  c.header('Set-Cookie', parts.join('; '), { append: true });
}
