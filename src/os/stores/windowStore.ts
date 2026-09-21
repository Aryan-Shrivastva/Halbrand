import { create } from 'zustand';
import { apps } from '@/os/registry';
import type { AppId, WindowState } from '@/os/types';

interface WindowStore {
  windows: Record<string, WindowState>;
  zOrder: string[];
  focusedWindowId: string | null;
  open: (appId: AppId, spaceId?: number) => string;
  close: (id: string) => void;
  closeAllForApp: (appId: AppId) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, width: number, height: number) => void;
  clearFocus: () => void;
  reset: () => void;
}

const initialState = { windows: {} as Record<string, WindowState>, zOrder: [] as string[], focusedWindowId: null as string | null };
const topVisibleWindow = (windows: Record<string, WindowState>, zOrder: string[]) => [...zOrder].reverse().find((id) => !windows[id]?.isMinimized) ?? null;

export const useWindowStore = create<WindowStore>()((set, get) => ({
  ...initialState,
  open: (appId, spaceId = 1) => {
    const id = `${appId}-${Math.random().toString(36).slice(2, 9)}`;
    const definition = apps[appId];
    const openCount = Object.keys(get().windows).length;
    const offset = (openCount * 28) % 168;
    const width = Math.min(definition.defaultWindow.width, Math.max(320, window.innerWidth * 0.9));
    const height = Math.min(definition.defaultWindow.height, Math.max(250, window.innerHeight * 0.78));
    const next: WindowState = { id, appId, spaceId, title: definition.name, x: Math.max(20, Math.round((window.innerWidth - width) / 2) + offset), y: Math.max(42, Math.round((window.innerHeight - height) / 2) - 20 + offset), width, height, isMinimized: false, isMaximized: false };
    set((state) => ({ windows: { ...state.windows, [id]: next }, zOrder: [...state.zOrder, id], focusedWindowId: id }));
    return id;
  },
  close: (id) => set((state) => {
    const remaining = { ...state.windows };
    delete remaining[id];
    const zOrder = state.zOrder.filter((windowId) => windowId !== id);
    return { windows: remaining, zOrder, focusedWindowId: state.focusedWindowId === id ? topVisibleWindow(remaining, zOrder) : state.focusedWindowId };
  }),
  closeAllForApp: (appId) => set((state) => {
    const remaining = Object.fromEntries(Object.entries(state.windows).filter(([, value]) => value.appId !== appId));
    const zOrder = state.zOrder.filter((id) => remaining[id]);
    return { windows: remaining, zOrder, focusedWindowId: topVisibleWindow(remaining, zOrder) };
  }),
  focus: (id) => set((state) => {
    const windowState = state.windows[id];
    if (!windowState) return state;
    const windows = { ...state.windows, [id]: { ...windowState, isMinimized: false } };
    return { windows, zOrder: [...state.zOrder.filter((windowId) => windowId !== id), id], focusedWindowId: id };
  }),
  minimize: (id) => set((state) => {
    const windowState = state.windows[id];
    if (!windowState) return state;
    const windows = { ...state.windows, [id]: { ...windowState, isMinimized: true } };
    return { windows, focusedWindowId: state.focusedWindowId === id ? topVisibleWindow(windows, state.zOrder) : state.focusedWindowId };
  }),
  restore: (id) => get().focus(id),
  toggleMaximize: (id) => set((state) => {
    const windowState = state.windows[id];
    if (!windowState) return state;
    const maximized = !windowState.isMaximized;
    const restoreBounds = maximized ? { x: windowState.x, y: windowState.y, width: windowState.width, height: windowState.height } : undefined;
    return { windows: { ...state.windows, [id]: { ...windowState, isMaximized: maximized, restoreBounds } } };
  }),
  move: (id, x, y) => set((state) => state.windows[id] ? { windows: { ...state.windows, [id]: { ...state.windows[id], x, y } } } : state),
  resize: (id, width, height) => set((state) => {
    const windowState = state.windows[id];
    if (!windowState || windowState.isMaximized) return state;
    const definition = apps[windowState.appId].defaultWindow;
    const nextWidth = Math.min(Math.max(width, definition.minWidth), Math.max(definition.minWidth, window.innerWidth - 24));
    const nextHeight = Math.min(Math.max(height, definition.minHeight), Math.max(definition.minHeight, window.innerHeight - 54));
    return { windows: { ...state.windows, [id]: { ...windowState, width: Math.round(nextWidth), height: Math.round(nextHeight) } } };
  }),
  clearFocus: () => set({ focusedWindowId: null }),
  reset: () => set(initialState),
}));
