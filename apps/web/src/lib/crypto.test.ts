import { describe, expect, it } from 'vitest';
import { AAD, KDF_DEFAULTS } from '@tnotes/shared';
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  base64ToBytes,
  bytesToBase64,
  computeLoginSecret,
  decryptJson,
  deriveFileKey,
  deriveMaster,
  deriveSubKey,
  encryptJson,
  randomBytes,
  unwrapKey,
  wrapKey,
} from './crypto';

describe('加密核心', () => {
  it('相同密码与 salt 派生一致，换 salt 则不同', async () => {
    const salt = bytesToBase64(randomBytes(16));
    const first = await deriveMaster('correct horse battery staple', salt, KDF_DEFAULTS);
    const second = await deriveMaster('correct horse battery staple', salt, KDF_DEFAULTS);
    const other = await deriveMaster(
      'correct horse battery staple',
      bytesToBase64(randomBytes(16)),
      KDF_DEFAULTS,
    );
    expect(bytesToBase64(first)).toBe(bytesToBase64(second));
    expect(bytesToBase64(first)).not.toBe(bytesToBase64(other));
  });

  it('HKDF 按 info 隔离子密钥', async () => {
    const master = randomBytes(32);
    const salt = randomBytes(16);
    const enc = await deriveSubKey(master, salt, 'tnotes:enc:v1');
    const auth = await deriveSubKey(master, salt, 'tnotes:auth:v1');
    expect(enc.length).toBe(32);
    expect(bytesToBase64(enc)).not.toBe(bytesToBase64(auth));
  });

  it('AES-GCM 往返正确且密文不含明文', async () => {
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const plaintext = new TextEncoder().encode('这是我的秘密笔记');
    const cipher = await aesGcmEncrypt(key, iv, plaintext);
    expect(new TextDecoder().decode(cipher)).not.toContain('秘密');
    const back = await aesGcmDecrypt(key, iv, cipher);
    expect(new TextDecoder().decode(back)).toBe('这是我的秘密笔记');
  });

  it('错误密钥或错误 AAD 解密失败', async () => {
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = await aesGcmEncrypt(key, iv, new TextEncoder().encode('hello'), AAD.note);
    await expect(aesGcmDecrypt(randomBytes(32), iv, cipher, AAD.note)).rejects.toBeTruthy();
    await expect(aesGcmDecrypt(key, iv, cipher, 'tnotes:other:v1')).rejects.toBeTruthy();
  });

  it('JSON 载荷加密后为密文字符串', async () => {
    const key = randomBytes(32);
    const payload = await encryptJson(key, { title: '密标题', doc: { type: 'doc' } }, AAD.note);
    expect(payload.cipher).not.toContain('密标题');
    expect(base64ToBytes(payload.iv).length).toBe(12);
    const plain = await decryptJson<{ title: string }>(key, payload.cipher, payload.iv, AAD.note);
    expect(plain.title).toBe('密标题');
  });

  it('密钥包裹可解包，错误包裹密钥失败', async () => {
    const kEnc = randomBytes(32);
    const kWrap = randomBytes(32);
    const wrapped = await wrapKey(kEnc, kWrap);
    const unwrapped = await unwrapKey(wrapped, kWrap);
    expect(bytesToBase64(unwrapped)).toBe(bytesToBase64(kEnc));
    const failed = await unwrapKey(wrapped, randomBytes(32)).catch(() => null);
    expect(failed).toBeNull();
  });

  it('登录凭据可复现且与数据密钥无关', async () => {
    const kLogin = randomBytes(32);
    const first = await computeLoginSecret(kLogin);
    const second = await computeLoginSecret(kLogin);
    expect(first).toBe(second);
    const fileKey = await deriveFileKey(randomBytes(32), bytesToBase64(randomBytes(16)));
    expect(bytesToBase64(fileKey)).not.toBe(first);
  });
});
