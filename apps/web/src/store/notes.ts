import { create } from 'zustand';
import { AAD, newId } from '@tnotes/shared';
import type { NoteContent, NoteListItem, NoteMeta, NoteRecord } from '@tnotes/shared';
import { api } from '../lib/api';
import * as C from '../lib/crypto';
import { encKey } from '../lib/vault';
import { cacheNotes } from '../lib/idb';
import { countWordsFromDoc } from '../lib/plain-text';

export const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

interface NotesState {
  meta: NoteMeta[];
  titles: Record<string, string>;
  content: Record<string, NoteContent>;
  activeId: string | null;
  loading: boolean;
  contentLoaded: boolean;
  saving: boolean;
  lastSavedAt: number | null;
  load: () => Promise<void>;
  loadContent: () => Promise<void>;
  loadOne: (id: string) => Promise<void>;
  loadAllContent: () => Promise<void>;
  createNote: () => Promise<string>;
  updateContent: (id: string, content: NoteContent, touch?: boolean) => Promise<void>;
  setFavorite: (id: string, favorited: boolean) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  purgeNote: (id: string) => Promise<void>;
  assignTags: (id: string, tagIds: string[]) => Promise<void>;
  assignNotebook: (id: string, notebookId: string | null) => Promise<void>;
}

async function encryptBody(doc: unknown): Promise<{ cipher: string; iv: string }> {
  return C.encryptJson(encKey(), { doc }, AAD.note);
}

async function encryptTitle(title: string): Promise<{ cipher: string; iv: string }> {
  return C.encryptJson(encKey(), title, AAD.title);
}

export const useNotesStore = create<NotesState>((set, get) => ({
  meta: [],
  titles: {},
  content: {},
  activeId: null,
  loading: false,
  contentLoaded: false,
  saving: false,
  lastSavedAt: null,

  load: async () => {
    set({ loading: true });
    await get().loadContent();
    set({ loading: false });
  },

  loadContent: async () => {
    const res = await api.get<{ notes: NoteListItem[] }>('/api/notes');
    const key = encKey();
    const titles: Record<string, string> = {};
    for (const item of res.notes) {
      if (!item.titleCipher) continue;
      const plain = await C.decryptJson<string>(key, item.titleCipher, item.titleIv, AAD.title);
      titles[item.id] = plain;
    }
    set({ meta: res.notes, titles: { ...get().titles, ...titles } });
  },

  loadOne: async (id) => {
    const res = await api.get<{ note: NoteRecord }>('/api/notes/' + id);
    const key = encKey();
    const body = await C.decryptJson<{ doc: unknown }>(key, res.note.cipher, res.note.iv, AAD.note);
    let title = '';
    if (res.note.titleCipher) {
      title = await C.decryptJson<string>(key, res.note.titleCipher, res.note.titleIv, AAD.title);
    }
    set((state) => ({
      content: { ...state.content, [id]: { title, doc: body.doc } },
      titles: { ...state.titles, [id]: title },
    }));
  },

  loadAllContent: async () => {
    const res = await api.get<{ notes: NoteRecord[] }>('/api/notes?include=content');
    const key = encKey();
    const content: Record<string, NoteContent> = {};
    const titles: Record<string, string> = {};
    for (const note of res.notes) {
      const body = await C.decryptJson<{ doc: unknown }>(key, note.cipher, note.iv, AAD.note);
      let title = '';
      if (note.titleCipher) {
        title = await C.decryptJson<string>(key, note.titleCipher, note.titleIv, AAD.title);
      }
      titles[note.id] = title;
      content[note.id] = { title, doc: body.doc };
    }
    set({ content, titles: { ...get().titles, ...titles }, contentLoaded: true });
    await cacheNotes(
      res.notes.map((note) => ({
        id: note.id,
        cipher: note.cipher,
        iv: note.iv,
        titleCipher: note.titleCipher,
        titleIv: note.titleIv,
        meta: {
          id: note.id,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          deletedAt: note.deletedAt,
          favorited: note.favorited,
          notebookId: note.notebookId,
          tagIds: note.tagIds,
          wordCount: note.wordCount,
          attachmentCount: note.attachmentCount,
        },
      })),
    );
  },
  createNote: async () => {
    const id = newId();
    const body = await encryptBody(EMPTY_DOC);
    const title = await encryptTitle('');
    const res = await api.post<{ note: NoteRecord }>('/api/notes', {
      id,
      cipher: body.cipher,
      iv: body.iv,
      titleCipher: title.cipher,
      titleIv: title.iv,
      wordCount: 0,
      attachmentCount: 0,
    });
    set((state) => ({
      meta: [res.note, ...state.meta],
      titles: { ...state.titles, [id]: '' },
      content: { ...state.content, [id]: { title: '', doc: EMPTY_DOC } },
      activeId: id,
    }));
    return id;
  },

  updateContent: async (id, content, touch = true) => {
    set({ saving: true });
    const body = await encryptBody(content.doc);
    const title = await encryptTitle(content.title);
    await api.patch('/api/notes/' + id, {
      cipher: body.cipher,
      iv: body.iv,
      titleCipher: title.cipher,
      titleIv: title.iv,
      wordCount: countWords(content),
      touch,
    });
    set((state) => ({
      content: { ...state.content, [id]: content },
      titles: { ...state.titles, [id]: content.title },
      meta: state.meta.map((note) =>
        note.id === id ? { ...note, wordCount: countWords(content), updatedAt: Date.now() } : note,
      ),
      saving: false,
      lastSavedAt: Date.now(),
    }));
  },

  setFavorite: async (id, favorited) => {
    await api.patch('/api/notes/' + id, { favorited, touch: false });
    set((state) => ({
      meta: state.meta.map((note) => (note.id === id ? { ...note, favorited } : note)),
    }));
  },

  moveToTrash: async (id) => {
    await api.del('/api/notes/' + id);
    set((state) => ({
      meta: state.meta.map((note) => (note.id === id ? { ...note, deletedAt: Date.now() } : note)),
    }));
  },

  restoreNote: async (id) => {
    await api.post('/api/notes/' + id + '/restore');
    set((state) => ({
      meta: state.meta.map((note) =>
        note.id === id ? { ...note, deletedAt: null, updatedAt: Date.now() } : note,
      ),
    }));
  },

  purgeNote: async (id) => {
    await api.del('/api/notes/' + id + '?permanent=1');
    set((state) => ({
      meta: state.meta.filter((note) => note.id !== id),
      content: Object.fromEntries(Object.entries(state.content).filter(([key]) => key !== id)),
      titles: Object.fromEntries(Object.entries(state.titles).filter(([key]) => key !== id)),
    }));
  },

  assignTags: async (id, tagIds) => {
    await api.patch('/api/notes/' + id, { tagIds, touch: false });
    set((state) => ({
      meta: state.meta.map((note) => (note.id === id ? { ...note, tagIds } : note)),
    }));
  },

  assignNotebook: async (id, notebookId) => {
    await api.patch('/api/notes/' + id, { notebookId, touch: false });
    set((state) => ({
      meta: state.meta.map((note) => (note.id === id ? { ...note, notebookId } : note)),
    }));
  },
}));

export function countWords(content: NoteContent): number {
  return countWordsFromDoc(content.doc);
}
