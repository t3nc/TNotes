import type { CipherPayload, KdfParams } from '@tnotes/shared';

const SETTINGS_KEY = 'app';

export interface AppSettings {
  initialized: boolean;
  displayName: string | null;
  /** base64 salt: 客户端据此派生 master */
  salt: string;
  kdfParams: KdfParams;
  /** base64(SHA256(loginSecret)), 服务端唯一保存的登录校验值 */
  authHash: string;
  /** 被 kWrap 包裹的数据密钥 kEnc */
  wrappedKey: CipherPayload;
  version: number;
  createdAt: number;
}

export async function getSettings(db: D1Database): Promise<AppSettings | null> {
  const row = await db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .bind(SETTINGS_KEY)
    .first<{ value: string }>();
  if (!row || !row.value) return null;
  try {
    return JSON.parse(row.value) as AppSettings;
  } catch {
    return null;
  }
}

export async function saveSettings(db: D1Database, settings: AppSettings): Promise<void> {
  await db
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    )
    .bind(SETTINGS_KEY, JSON.stringify(settings))
    .run();
}
