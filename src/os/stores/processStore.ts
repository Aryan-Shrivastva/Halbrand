import { create } from 'zustand';
import type { AppId } from '@/os/types';

interface ProcessState {
  running: AppId[];
  launch: (appId: AppId) => void;
  quit: (appId: AppId) => void;
  reset: () => void;
}

export const useProcessStore = create<ProcessState>()((set) => ({
  running: ['finder'],
  launch: (appId) => set((state) => state.running.includes(appId) ? state : { running: [...state.running, appId] }),
  quit: (appId) => set((state) => appId === 'finder' ? state : { running: state.running.filter((id) => id !== appId) }),
  reset: () => set({ running: ['finder'] }),
}));
