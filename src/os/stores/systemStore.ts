import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'auto';
export type BootState = 'off' | 'booting' | 'ready' | 'sleeping' | 'shutdown';

interface SystemState {
  boot: BootState;
  activeAppId: string;
  focusedWindowId: string | null;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  setBoot: (boot: BootState) => void;
}

const safeStorage: StateStorage = {
  getItem: (name: string) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Private browsing and restrictive browser settings can disable storage.
    }
  },
  removeItem: (name: string) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Storage is optional for the desktop experience.
    }
  },
};

export const useSystemStore = create<SystemState>()(
  persist(
    (set) => ({
      boot: 'off',
      activeAppId: 'finder',
      focusedWindowId: null,
      theme: 'auto',
      setTheme: (theme) => set({ theme }),
      setBoot: (boot) => set({ boot }),
    }),
    {
      name: 'theme',
      storage: createJSONStorage<Pick<SystemState, 'theme'>>(() => safeStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
