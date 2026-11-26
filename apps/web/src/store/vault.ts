import { create } from 'zustand';
import {
  fetchAuthState,
  isUnlocked,
  lockVault,
  logout as vaultLogout,
  setupVault,
  unlockVault,
} from '../lib/vault';

export type VaultStatus = 'loading' | 'needs-setup' | 'locked' | 'unlocked';

interface VaultState {
  status: VaultStatus;
  displayName: string | null;
  busy: boolean;
  error: string | null;
  init: () => Promise<void>;
  setup: (password: string, displayName: string, setupToken: string) => Promise<boolean>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

function messageOf(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string' && value) return value;
  }
  return fallback;
}

export const useVaultStore = create<VaultState>((set) => ({
  status: 'loading',
  displayName: null,
  busy: false,
  error: null,

  init: async () => {
    const state = await fetchAuthState()
      .then((auth) => {
        set({ displayName: auth.displayName });
        return auth;
      })
      .catch(() => null);
    if (!state) {
      set({ status: 'locked' });
      return;
    }
    set({ status: state.initialized ? (isUnlocked() ? 'unlocked' : 'locked') : 'needs-setup' });
  },

  setup: async (password, displayName, setupToken) => {
    set({ busy: true, error: null });
    return setupVault(password, displayName, setupToken)
      .then(() => {
        set({ status: 'unlocked', busy: false, displayName: displayName || null });
        return true;
      })
      .catch((error: unknown) => {
        set({ busy: false, error: messageOf(error, '初始化失败，请重试') });
        return false;
      });
  },

  unlock: async (password) => {
    set({ busy: true, error: null });
    return unlockVault(password)
      .then((auth) => {
        set({ status: 'unlocked', busy: false, displayName: auth.displayName });
        return true;
      })
      .catch((error: unknown) => {
        set({ busy: false, error: messageOf(error, '解锁失败，请重试') });
        return false;
      });
  },

  lock: () => {
    lockVault();
    set({ status: 'locked', error: null });
  },

  logout: async () => {
    await vaultLogout();
    set({ status: 'locked', error: null, displayName: null });
  },

  clearError: () => set({ error: null }),
}));
