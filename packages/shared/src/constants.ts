/** 全局共享常量：加密参数、协议版本、配额限制。 */

/** Argon2id 默认参数（OWASP 推荐的 19MiB / t=2 / p=1，移动端约 0.3~1s） */
export const KDF_DEFAULTS = {
  algo: 'argon2id',
  memorySize: 19456,
  iterations: 2,
  parallelism: 1,
  hashLength: 32,
  saltLength: 16,
} as const;

/** KDF 参数下限：服务端校验，防止客户端把强度降到极低 */
export const KDF_MINIMUMS = {
  memorySize: 19456,
  iterations: 2,
  parallelism: 1,
} as const;

/** HKDF info 标签 —— 子密钥域隔离，改一个不会影响其它 */
export const HKDF_INFO = {
  enc: 'tnotes:enc:v1',
  wrap: 'tnotes:wrap:v1',
  auth: 'tnotes:auth:v1',
  file: 'tnotes:file:v1',
} as const;

/** HMAC 消息：登录凭据派生 */
export const LOGIN_MAC_MESSAGE = 'tnotes:login:v1';

/** AES-GCM IV 长度（字节） */
export const IV_BYTES = 12;

/** 随机 salt 长度（字节） */
export const SALT_BYTES = 16;

/** 数据密钥长度（字节） */
export const KEY_BYTES = 32;

/** GCM additionalData —— 绑定密文用途 */
export const AAD = {
  note: 'tnotes:note:v1',
  title: 'tnotes:title:v1',
  notebook: 'tnotes:notebook:v1',
  tag: 'tnotes:tag:v1',
  file: 'tnotes:file:v1',
  wrap: 'tnotes:wrap:v1',
} as const;

/** 附件分块大小（D1 单值体积安全线） */
export const ATTACHMENT_CHUNK_BYTES = 256 * 1024;

/** 单个附件体积上限 */
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

/** 单次上传请求体积上限 */
export const MAX_REQUEST_BYTES = 8 * 1024 * 1024;

/** 会话有效期 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 登录失败统计窗口 */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** 登录失败次数上限（超出返回 429） */
export const LOGIN_MAX_FAILURES = 10;

/** 客户端 IndexedDB 缓存 key */
export const CACHE_KEYS = {
  notes: 'tnotes:cache:notes',
  meta: 'tnotes:cache:meta',
} as const;

/** 导出 ZIP 中的元信息版本 */
export const EXPORT_FORMAT_VERSION = 1;

