import { beforeEach, describe, expect, it } from 'vitest';
import { useWindowStore } from '@/os/stores/windowStore';

Object.defineProperty(globalThis, 'window', {
  value: { innerWidth: 1280, innerHeight: 800 },
  configurable: true,
});

describe('windowStore focus rules', () => {
  beforeEach(() => useWindowStore.getState().reset());

  it('focuses each new window and puts it at the front', () => {
    const first = useWindowStore.getState().open('notes');
    const second = useWindowStore.getState().open('terminal');
    const state = useWindowStore.getState();
    expect(state.focusedWindowId).toBe(second);
    expect(state.zOrder).toEqual([first, second]);
  });

  it('focuses the next visible window when the active one is minimized', () => {
    const first = useWindowStore.getState().open('notes');
    const second = useWindowStore.getState().open('terminal');
    useWindowStore.getState().minimize(second);
    const state = useWindowStore.getState();
    expect(state.windows[second].isMinimized).toBe(true);
    expect(state.focusedWindowId).toBe(first);
  });

  it('restores a minimized window when it is focused', () => {
    const id = useWindowStore.getState().open('notes');
    useWindowStore.getState().minimize(id);
    useWindowStore.getState().focus(id);
    const state = useWindowStore.getState();
    expect(state.windows[id].isMinimized).toBe(false);
    expect(state.focusedWindowId).toBe(id);
  });

  it('falls back to the desktop when the last visible window closes', () => {
    const id = useWindowStore.getState().open('notes');
    useWindowStore.getState().close(id);
    expect(useWindowStore.getState().focusedWindowId).toBeNull();
  });

  it('respects a window minimum size when resizing', () => {
    const id = useWindowStore.getState().open('terminal');
    useWindowStore.getState().resize(id, 100, 100);
    const state = useWindowStore.getState();
    expect(state.windows[id].width).toBe(470);
    expect(state.windows[id].height).toBe(290);
  });
});
