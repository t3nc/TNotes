import { strToU8, unzipSync, zipSync } from 'fflate';
import { EXPORT_FORMAT_VERSION } from '@tnotes/shared';
import type { Bytes } from '@tnotes/shared';

export interface ExportAttachment {
  id: string;
  fileName: string;
  bytes: Bytes;
}

export interface ExportNote {
  id: string;
  title: string;
  markdown: string;
  tags: string[];
  notebook: string | null;
  createdAt: number;
  updatedAt: number;
  attachments: ExportAttachment[];
}

export interface ExportMeta {
  version: number;
  exportedAt: number;
  count: number;
  notes: {
    id: string;
    title: string;
    tags: string[];
    notebook: string | null;
    createdAt: number;
    updatedAt: number;
    file: string;
    attachments: string[];
  }[];
}

export function safeFileName(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 40);
  return cleaned || '未命名笔记';
}

export function noteFileName(note: ExportNote): string {
  return 'notes/' + safeFileName(note.title) + '-' + note.id.slice(0, 8) + '.md';
}

export function buildZip(notes: ExportNote[], exportedAt: number): Bytes {
  const files: Record<string, Uint8Array> = {};
  const meta: ExportMeta = {
    version: EXPORT_FORMAT_VERSION,
    exportedAt,
    count: notes.length,
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      tags: note.tags,
      notebook: note.notebook,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      file: noteFileName(note),
      attachments: note.attachments.map((att) => 'attachments/' + att.fileName),
    })),
  };

  files['meta.json'] = strToU8(JSON.stringify(meta, null, 2));
  for (const note of notes) {
    files[noteFileName(note)] = strToU8(note.markdown);
    for (const att of note.attachments) {
      files['attachments/' + att.fileName] = att.bytes;
    }
  }
  return zipSync(files, { level: 6 }) as Bytes;
}

export interface ParsedBackup {
  meta: ExportMeta;
  notes: { id: string; title: string; markdown: string; tags: string[]; notebook: string | null }[];
  attachments: Record<string, Bytes>;
}

export function parseZip(bytes: Bytes): ParsedBackup {
  const entries = unzipSync(bytes);
  const decoder = new TextDecoder();
  const metaRaw = entries['meta.json'];
  if (!metaRaw) throw new Error('备份文件缺少 meta.json');
  const meta = JSON.parse(decoder.decode(metaRaw)) as ExportMeta;

  const attachments: Record<string, Bytes> = {};
  for (const [name, data] of Object.entries(entries)) {
    if (name.startsWith('attachments/')) attachments[name] = data;
  }

  const notes = meta.notes.map((entry) => ({
    id: entry.id,
    title: entry.title,
    tags: entry.tags ?? [],
    notebook: entry.notebook ?? null,
    markdown: entries[entry.file] ? decoder.decode(entries[entry.file]) : '',
  }));

  return { meta, notes, attachments };
}

export function mimeToExtension(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'bin';
}

export function rewriteAttachmentRefs(markdown: string, mapping: Record<string, string>): string {
  let output = markdown;
  for (const [attachmentId, fileName] of Object.entries(mapping)) {
    output = output.split('attachment:' + attachmentId).join('attachments/' + fileName);
  }
  return output;
}

export function replaceImageSources(doc: unknown, mapping: Record<string, string>): unknown {
  if (!doc || typeof doc !== 'object') return doc;
  const node = doc as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] };
  if (node.type === 'image' && node.attrs && typeof node.attrs.src === 'string') {
    const src = node.attrs.src;
    if (src.startsWith('attachments/')) {
      const fileName = src.replace('attachments/', '');
      const newId = mapping[fileName];
      if (newId) node.attrs.src = 'attachment:' + newId;
    }
  }
  if (Array.isArray(node.content)) {
    node.content = node.content.map((child) => replaceImageSources(child, mapping));
  }
  return doc;
}
