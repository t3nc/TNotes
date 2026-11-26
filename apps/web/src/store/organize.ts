import { create } from 'zustand';
import { AAD, newId } from '@tnotes/shared';
import type { NotebookContent, TagContent } from '@tnotes/shared';
import { api } from '../lib/api';
import * as C from '../lib/crypto';
import { encKey } from '../lib/vault';

export interface NotebookItem {
  id: string;
  name: string;
}

export interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface OrganizeState {
  notebooks: NotebookItem[];
  tags: TagItem[];
  load: () => Promise<void>;
  addNotebook: (name: string) => Promise<string>;
  renameNotebook: (id: string, name: string) => Promise<void>;
  removeNotebook: (id: string) => Promise<void>;
  addTag: (name: string, color: string) => Promise<string>;
  renameTag: (id: string, name: string, color: string) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
}

export const useOrganizeStore = create<OrganizeState>((set) => ({
  notebooks: [],
  tags: [],

  load: async () => {
    const [notebooksRes, tagsRes] = await Promise.all([
      api.get<{ notebooks: { id: string; cipher: string; iv: string }[] }>('/api/notebooks'),
      api.get<{ tags: { id: string; cipher: string; iv: string }[] }>('/api/tags'),
    ]);
    const key = encKey();
    const notebooks: NotebookItem[] = [];
    for (const nb of notebooksRes.notebooks) {
      const plain = await C.decryptJson<NotebookContent>(key, nb.cipher, nb.iv, AAD.notebook);
      notebooks.push({ id: nb.id, name: plain.name });
    }
    const tags: TagItem[] = [];
    for (const tag of tagsRes.tags) {
      const plain = await C.decryptJson<TagContent>(key, tag.cipher, tag.iv, AAD.tag);
      tags.push({ id: tag.id, name: plain.name, color: plain.color || '#7C6CF6' });
    }
    set({ notebooks, tags });
  },

  addNotebook: async (name) => {
    const id = newId();
    const payload = await C.encryptJson(encKey(), { name }, AAD.notebook);
    await api.post('/api/notebooks', { id, cipher: payload.cipher, iv: payload.iv });
    set((state) => ({ notebooks: [...state.notebooks, { id, name }] }));
    return id;
  },

  renameNotebook: async (id, name) => {
    const payload = await C.encryptJson(encKey(), { name }, AAD.notebook);
    await api.patch('/api/notebooks/' + id, { cipher: payload.cipher, iv: payload.iv });
    set((state) => ({
      notebooks: state.notebooks.map((nb) => (nb.id === id ? { ...nb, name } : nb)),
    }));
  },

  removeNotebook: async (id) => {
    await api.del('/api/notebooks/' + id);
    set((state) => ({ notebooks: state.notebooks.filter((nb) => nb.id !== id) }));
  },

  addTag: async (name, color) => {
    const id = newId();
    const payload = await C.encryptJson(encKey(), { name, color }, AAD.tag);
    await api.post('/api/tags', { id, cipher: payload.cipher, iv: payload.iv });
    set((state) => ({ tags: [...state.tags, { id, name, color }] }));
    return id;
  },

  renameTag: async (id, name, color) => {
    const payload = await C.encryptJson(encKey(), { name, color }, AAD.tag);
    await api.patch('/api/tags/' + id, { cipher: payload.cipher, iv: payload.iv });
    set((state) => ({
      tags: state.tags.map((tag) => (tag.id === id ? { ...tag, name, color } : tag)),
    }));
  },

  removeTag: async (id) => {
    await api.del('/api/tags/' + id);
    set((state) => ({ tags: state.tags.filter((tag) => tag.id !== id) }));
  },
}));
