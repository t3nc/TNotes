import { argon2id } from 'hash-wasm';
import { AAD, HKDF_INFO, IV_BYTES, KEY_BYTES, LOGIN_MAC_MESSAGE } from '@tnotes/shared';
import type { Bytes, KdfParams } from '@tnotes/shared';

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Bytes {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function randomBytes(length: number): Bytes {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function ensureKdfParams(params: KdfParams | null | undefined): KdfParams {
  const fallback: KdfParams = {
    algo: 'argon2id',
    memorySize: 19456,
    iterations: 2,
    parallelism: 1,
    hashLength: 32,
    saltLength: 16,
  };
  if (!params || params.algo !== 'argon2id') return fallback;
  if (params.memorySize < 8192 || params.iterations < 1) return fallback;
  return {
    algo: 'argon2id',
    memorySize: params.memorySize,
    iterations: params.iterations,
    parallelism: params.parallelism || 1,
    hashLength: 32,
    saltLength: 16,
  };
}

export async function deriveMaster(
  password: string,
  saltB64: string,
  params: KdfParams,
): Promise<Bytes> {
  const salt = base64ToBytes(saltB64);
  const out = await argon2id({
    password,
    salt,
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memorySize,
    hashLength: params.hashLength,
    outputType: 'binary',
  });
  return out as Bytes;
}

async function hmacBytes(key: Bytes, data: Bytes): Promise<Bytes> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data as BufferSource);
  return new Uint8Array(signature) as Bytes;
}

export async function hkdf(
  ikm: Bytes,
  salt: Bytes,
  info: string,
  length = KEY_BYTES,
): Promise<Bytes> {
  const prk = await hmacBytes(salt, ikm);
  const infoBytes = new TextEncoder().encode(info);
  const output = new Uint8Array(length);
  let previous = new Uint8Array(0);
  let offset = 0;
  let counter = 1;
  while (offset < length) {
    const input = new Uint8Array(previous.length + infoBytes.length + 1);
    input.set(previous, 0);
    input.set(infoBytes, previous.length);
    input[input.length - 1] = counter;
    previous = await hmacBytes(prk, input);
    const take = Math.min(previous.length, length - offset);
    output.set(previous.subarray(0, take), offset);
    offset += take;
    counter += 1;
  }
  return output;
}

export async function deriveSubKey(master: Bytes, salt: Bytes, info: string): Promise<Bytes> {
  return hkdf(master, salt, info, KEY_BYTES);
}

export async function aesGcmEncrypt(
  key: Bytes,
  iv: Bytes,
  plaintext: Bytes,
  aad?: string,
): Promise<Bytes> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
  const params: AesGcmParams = { name: 'AES-GCM', iv };
  if (aad) params.additionalData = new TextEncoder().encode(aad);
  const result = await crypto.subtle.encrypt(params, cryptoKey, plaintext as BufferSource);
  return new Uint8Array(result) as Bytes;
}

export async function aesGcmDecrypt(
  key: Bytes,
  iv: Bytes,
  ciphertext: Bytes,
  aad?: string,
): Promise<Bytes> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
  const params: AesGcmParams = { name: 'AES-GCM', iv };
  if (aad) params.additionalData = new TextEncoder().encode(aad);
  const result = await crypto.subtle.decrypt(params, cryptoKey, ciphertext as BufferSource);
  return new Uint8Array(result) as Bytes;
}

export async function encryptJson(
  key: Bytes,
  value: unknown,
  aad: string,
): Promise<{ cipher: string; iv: string }> {
  const iv = randomBytes(IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await aesGcmEncrypt(key, iv, plaintext, aad);
  return { cipher: bytesToBase64(cipher), iv: bytesToBase64(iv) };
}

export async function decryptJson<T>(
  key: Bytes,
  cipher: string,
  iv: string,
  aad: string,
): Promise<T> {
  const plaintext = await aesGcmDecrypt(key, base64ToBytes(iv), base64ToBytes(cipher), aad);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export async function computeLoginSecret(kLogin: Bytes): Promise<string> {
  const mac = await hmacBytes(kLogin, new TextEncoder().encode(LOGIN_MAC_MESSAGE));
  return bytesToBase64(mac);
}

export async function wrapKey(kEnc: Bytes, kWrap: Bytes): Promise<{ cipher: string; iv: string }> {
  const iv = randomBytes(IV_BYTES);
  const cipher = await aesGcmEncrypt(kWrap, iv, kEnc, AAD.wrap);
  return { cipher: bytesToBase64(cipher), iv: bytesToBase64(iv) };
}

export async function unwrapKey(
  wrapped: { cipher: string; iv: string },
  kWrap: Bytes,
): Promise<Bytes> {
  return aesGcmDecrypt(kWrap, base64ToBytes(wrapped.iv), base64ToBytes(wrapped.cipher), AAD.wrap);
}

export async function deriveFileKey(kEnc: Bytes, saltB64: string): Promise<Bytes> {
  return hkdf(kEnc, base64ToBytes(saltB64), HKDF_INFO.file, KEY_BYTES);
}

export { HKDF_INFO, AAD };
