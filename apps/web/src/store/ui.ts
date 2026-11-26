import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface UiState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  toasts: ToastItem[];
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: (open?: boolean) => void;
  pushToast: (message: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: number) => void;
}

const THEME_KEY = 'tnotes:theme';

function readTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

let toastSeq = 0;

export const useUiStore = create<UiState>((set) => ({
  theme: readTheme(),
  sidebarOpen: false,
  toasts: [],
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleSidebar: (open) => set((state) => ({ sidebarOpen: open ?? !state.sidebarOpen })),
  pushToast: (message, tone = 'info') => {
    toastSeq += 1;
    const id = toastSeq;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 3200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
}
