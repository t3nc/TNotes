/**
 * 前后端共享的数据契约。
 *
 * 安全边界：服务端只保存 `cipher` / `iv`（密文）以及最小结构元数据，
 * 标题、正文、笔记本名、标签名等一切人类可读内容都在浏览器内加密后再上传。
 */

/** 明确绑定 ArrayBuffer 的字节数组（TS 5.7 泛型约束） */
export type Bytes = Uint8Array<ArrayBuffer>;

/** AES-256-GCM 密文载荷（base64） */
export interface CipherPayload {
  /** base64 编码的密文（含 GCM tag） */
  cipher: string;
  /** base64 编码的 12 字节随机 IV */
  iv: string;
}

/** Argon2id 参数，服务端按存储值校验，防止客户端降级 */
export interface KdfParams {
  algo: 'argon2id';
  /** KiB */
  memorySize: number;
  iterations: number;
  parallelism: number;
  hashLength: number;
  saltLength: number;
}

/** 笔记元数据（服务端可见） */
export interface NoteMeta {
  id: string;
  createdAt: number;
  updatedAt: number;
  /** 回收站软删标记 */
  deletedAt: number | null;
  favorited: boolean;
  notebookId: string | null;
  tagIds: string[];
  wordCount: number;
  attachmentCount: number;
}

/** 笔记列表项：元数据 + 标题密文（列表只解密标题，不传输正文） */
export interface NoteListItem extends NoteMeta {
  titleCipher: string;
  titleIv: string;
}

/** 笔记完整记录（元数据 + 标题密文 + 正文密文） */
export interface NoteRecord extends NoteMeta, CipherPayload {
  titleCipher: string;
  titleIv: string;
}

/** 笔记本（名称密文） */
export interface NotebookRecord extends CipherPayload {
  id: string;
  createdAt: number;
}

/** 标签（名称密文） */
export interface TagRecord extends CipherPayload {
  id: string;
  createdAt: number;
}

/** 附件元信息（图片字节密文） */
export interface AttachmentMeta {
  id: string;
  noteId: string;
  mime: string;
  size: number;
  chunkCount: number;
  /** base64 编码的文件密钥 salt */
  salt: string;
  /** base64 编码的 12 字节 IV */
  iv: string;
  createdAt: number;
}

/** 附件完整记录（含密文） */
export interface AttachmentPayload extends AttachmentMeta, CipherPayload {}

/** 初始化 / 解锁前的公开状态 */
export interface AuthState {
  initialized: boolean;
  displayName: string | null;
  /** base64 salt，客户端据此派生 master */
  salt: string | null;
  kdfParams: KdfParams | null;
}

/** 客户端加密后再上传的笔记明文结构（仅存在于浏览器内存） */
export interface NoteContent {
  title: string;
  /** TipTap / ProseMirror JSON 文档 */
  doc: unknown;
}

/** 笔记本明文结构 */
export interface NotebookContent {
  name: string;
}

/** 标签明文结构 */
export interface TagContent {
  name: string;
  color: string;
}

/** 统一错误响应体 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

