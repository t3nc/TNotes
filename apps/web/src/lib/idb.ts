import { del, get, set } from 'idb-keyval';
import { CACHE_KEYS } from '@tnotes/shared';
import type { NoteMeta } from '@tnotes/shared';

export interface CachedNote {
  id: string;
  cipher: string;
  iv: string;
  titleCipher: string;
  titleIv: string;
  meta: NoteMeta;
}

export async function cacheNotes(records: CachedNote[]): Promise<void> {
  await set(CACHE_KEYS.notes, records);
}

export async function readCachedNotes(): Promise<CachedNote[]> {
  const value = await get<CachedNote[]>(CACHE_KEYS.notes);
  return Array.isArray(value) ? value : [];
}

export async function clearCache(): Promise<void> {
  await del(CACHE_KEYS.notes);
}
