import { HKDF_INFO, KDF_DEFAULTS, SALT_BYTES } from '@tnotes/shared';
import type { AuthState, Bytes, KdfParams } from '@tnotes/shared';
import { api } from './api';
import * as C from './crypto';

interface VaultKeys {
  kEnc: Bytes;
  kLogin: Bytes;
}

export interface LoginResponse {
  ok: boolean;
  displayName: string | null;
  salt: string;
  kdfParams: KdfParams;
  wrappedKey: { cipher: string; iv: string };
}

let keys: VaultKeys | null = null;

export function isUnlocked(): boolean {
  return keys !== null;
}

export function encKey(): Bytes {
  if (!keys) throw new Error('笔记库已锁定');
  return keys.kEnc;
}

export function lockVault(): void {
  if (keys) {
    keys.kEnc.fill(0);
    keys.kLogin.fill(0);
  }
  keys = null;
}

export function fetchAuthState(): Promise<AuthState> {
  return api.get<AuthState>('/api/auth/state');
}

export async function setupVault(
  password: string,
  displayName: string,
  setupToken: string,
): Promise<void> {
  const salt = C.randomBytes(SALT_BYTES);
  const saltB64 = C.bytesToBase64(salt);
  const params: KdfParams = { ...KDF_DEFAULTS };
  const master = await C.deriveMaster(password, saltB64, params);
  const kWrap = await C.deriveSubKey(master, salt, HKDF_INFO.wrap);
  const kLogin = await C.deriveSubKey(master, salt, HKDF_INFO.auth);
  const kEnc = C.randomBytes(32);
  const loginSecret = await C.computeLoginSecret(kLogin);
  const wrappedKey = await C.wrapKey(kEnc, kWrap);
  await api.post('/api/auth/setup', {
    setupToken,
    displayName,
    salt: saltB64,
    kdfParams: params,
    loginSecret,
    wrappedKey,
  });
  keys = { kEnc, kLogin };
}

export async function unlockVault(password: string): Promise<AuthState> {
  const state = await fetchAuthState();
  if (!state.initialized || !state.salt || !state.kdfParams) {
    throw new Error('笔记库尚未初始化');
  }
  const params = C.ensureKdfParams(state.kdfParams);
  const salt = C.base64ToBytes(state.salt);
  const master = await C.deriveMaster(password, state.salt, params);
  const kWrap = await C.deriveSubKey(master, salt, HKDF_INFO.wrap);
  const kLogin = await C.deriveSubKey(master, salt, HKDF_INFO.auth);
  const loginSecret = await C.computeLoginSecret(kLogin);
  const res = await api.post<LoginResponse>('/api/auth/login', { loginSecret });
  const kEnc = await C.unwrapKey(res.wrappedKey, kWrap);
  keys = { kEnc, kLogin };
  return { ...state, displayName: res.displayName };
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  if (!keys) throw new Error('笔记库已锁定');
  const state = await fetchAuthState();
  if (!state.salt || !state.kdfParams) throw new Error('笔记库尚未初始化');

  const params = C.ensureKdfParams(state.kdfParams);
  const oldSalt = C.base64ToBytes(state.salt);
  const oldMaster = await C.deriveMaster(oldPassword, state.salt, params);
  const oldLogin = await C.deriveSubKey(oldMaster, oldSalt, HKDF_INFO.auth);
  const oldSecret = await C.computeLoginSecret(oldLogin);

  const newSalt = C.randomBytes(SALT_BYTES);
  const newSaltB64 = C.bytesToBase64(newSalt);
  const newMaster = await C.deriveMaster(newPassword, newSaltB64, params);
  const newWrap = await C.deriveSubKey(newMaster, newSalt, HKDF_INFO.wrap);
  const newLogin = await C.deriveSubKey(newMaster, newSalt, HKDF_INFO.auth);
  const newSecret = await C.computeLoginSecret(newLogin);
  const wrappedKey = await C.wrapKey(keys.kEnc, newWrap);

  await api.post('/api/auth/password', {
    oldLoginSecret: oldSecret,
    newLoginSecret: newSecret,
    salt: newSaltB64,
    kdfParams: params,
    wrappedKey,
  });
  keys = { kEnc: keys.kEnc, kLogin: newLogin };
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout').catch(() => undefined);
  lockVault();
}
