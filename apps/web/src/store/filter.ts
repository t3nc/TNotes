import { create } from 'zustand';

export type Scope = 'all' | 'favorite' | 'trash';
export type SortKey = 'updated' | 'created' | 'title' | 'words';

interface FilterState {
  scope: Scope;
  notebookId: string | null;
  tagId: string | null;
  query: string;
  sort: SortKey;
  setScope: (scope: Scope) => void;
  setNotebook: (notebookId: string | null) => void;
  setTag: (tagId: string | null) => void;
  setQuery: (query: string) => void;
  setSort: (sort: SortKey) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  scope: 'all',
  notebookId: null,
  tagId: null,
  query: '',
  sort: 'updated',
  setScope: (scope) => set({ scope, notebookId: null, tagId: null }),
  setNotebook: (notebookId) => set({ notebookId, tagId: null, scope: 'all' }),
  setTag: (tagId) => set({ tagId, notebookId: null, scope: 'all' }),
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ scope: 'all', notebookId: null, tagId: null, query: '', sort: 'updated' }),
}));
