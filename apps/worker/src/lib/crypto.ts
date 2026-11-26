/** 服务端侧密码学工具：只做哈希与比较，不实现 KDF，也不接触任何明文内容。 */

import { bytesToBase64, bytesToBase64Url } from './base64';

/** 计算字符串的 SHA-256 */
export async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer);
  return new Uint8Array(digest);
}

/** 计算字符串的 SHA-256 并返回 base64 */
export async function sha256Base64(input: string): Promise<string> {
  return bytesToBase64(await sha256(input));
}

/** 恒定时间字符串比较（长度不同直接返回 false） */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** 生成随机会话 token（base64url） */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}
