import { AAD, MAX_ATTACHMENT_BYTES } from '@tnotes/shared';
import type { Bytes } from '@tnotes/shared';
import type { AttachmentPayload } from '@tnotes/shared';
import { api } from './api';
import * as C from './crypto';
import { encKey } from './vault';

export interface UploadedAttachment {
  id: string;
  mime: string;
  size: number;
  salt: string;
  iv: string;
}

const objectUrlCache = new Map<string, string>();

export async function uploadAttachment(
  noteId: string,
  data: Bytes,
  mime: string,
): Promise<UploadedAttachment> {
  if (data.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error('图片超出 2MB 上限，请压缩后再上传');
  }
  const salt = C.randomBytes(16);
  const iv = C.randomBytes(12);
  const kFile = await C.deriveFileKey(encKey(), C.bytesToBase64(salt));
  const cipher = await C.aesGcmEncrypt(kFile, iv, data, AAD.file);

  const res = await api.postBinary<{ attachment: UploadedAttachment }>(
    '/api/attachments',
    cipher,
    {
      'Content-Type': 'application/octet-stream',
      'x-tnotes-note-id': noteId,
      'x-tnotes-mime': mime,
      'x-tnotes-salt': C.bytesToBase64(salt),
      'x-tnotes-iv': C.bytesToBase64(iv),
    },
  );
  return res.attachment;
}

export async function listAttachments(noteId: string): Promise<UploadedAttachment[]> {
  const res = await api.get<{ attachments: UploadedAttachment[] }>('/api/attachments?noteId=' + noteId);
  return res.attachments;
}

export async function downloadAttachment(id: string): Promise<{ mime: string; bytes: Bytes }> {
  const res = await api.get<{ attachment: AttachmentPayload }>('/api/attachments/' + id);
  const kFile = await C.deriveFileKey(encKey(), res.attachment.salt);
  const bytes = await C.aesGcmDecrypt(
    kFile,
    C.base64ToBytes(res.attachment.iv),
    C.base64ToBytes(res.attachment.cipher),
    AAD.file,
  );
  return { mime: res.attachment.mime, bytes };
}

export async function loadAttachmentObjectUrl(id: string): Promise<string> {
  const cached = objectUrlCache.get(id);
  if (cached) return cached;
  const { mime, bytes } = await downloadAttachment(id);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
}

export function revokeAttachmentUrls(): void {
  for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
  objectUrlCache.clear();
}
