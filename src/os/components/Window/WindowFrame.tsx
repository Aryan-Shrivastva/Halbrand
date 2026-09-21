import { useRef, type PointerEvent, type ReactNode } from 'react';
import { apps } from '@/os/registry';
import { useWindowStore } from '@/os/stores/windowStore';
import type { WindowState } from '@/os/types';

interface WindowFrameProps { windowState: WindowState; children: ReactNode; }

export function WindowFrame({ windowState, children }: WindowFrameProps) {
  const { focus, close, minimize, toggleMaximize, move, resize } = useWindowStore();
  const drag = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const resizeSession = useRef<{ pointerX: number; pointerY: number; width: number; height: number } | null>(null);
  const definition = apps[windowState.appId];
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    focus(windowState.id);
    if (windowState.isMaximized || (event.target as HTMLElement).closest('button, input')) return;
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, x: windowState.x, y: windowState.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const x = clamp(drag.current.x + event.clientX - drag.current.pointerX, -windowState.width + 60, window.innerWidth - 60);
    const y = clamp(drag.current.y + event.clientY - drag.current.pointerY, 29, window.innerHeight - 28);
    move(windowState.id, x, y);
  };
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handleResizeDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    focus(windowState.id);
    if (windowState.isMaximized || !definition.defaultWindow.resizable) return;
    resizeSession.current = { pointerX: event.clientX, pointerY: event.clientY, width: windowState.width, height: windowState.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleResizeMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!resizeSession.current) return;
    resize(windowState.id, resizeSession.current.width + event.clientX - resizeSession.current.pointerX, resizeSession.current.height + event.clientY - resizeSession.current.pointerY);
  };
  const handleResizeUp = (event: PointerEvent<HTMLButtonElement>) => {
    resizeSession.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const style = windowState.isMaximized ? undefined : { left: windowState.x, top: windowState.y, width: windowState.width, height: windowState.height, zIndex: 100 + useWindowStore.getState().zOrder.indexOf(windowState.id) };
  return <section className={`os-window ${windowState.isMaximized ? 'maximized' : ''} ${useWindowStore.getState().focusedWindowId === windowState.id ? 'focused' : ''}`} style={style} onPointerDown={() => focus(windowState.id)}>
    <div className={`window-titlebar ${definition.titlebarStyle}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onDoubleClick={() => toggleMaximize(windowState.id)}>
      <div className="traffic-lights"><button className="traffic-light close" type="button" aria-label={`Close ${windowState.title}`} onClick={() => close(windowState.id)} /><button className="traffic-light minimize" type="button" aria-label={`Minimize ${windowState.title}`} onClick={() => minimize(windowState.id)} /><button className="traffic-light zoom" type="button" aria-label={`Zoom ${windowState.title}`} onClick={() => toggleMaximize(windowState.id)} /></div>
      <div className="window-title">{windowState.title}</div><div className="title-actions"><span>⌯</span><span>•••</span></div>
    </div>
    <div className="window-content">{children}</div>
    {!windowState.isMaximized && definition.defaultWindow.resizable && <button className="window-resize-handle" type="button" aria-label={`Resize ${windowState.title}`} onPointerDown={handleResizeDown} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerCancel={handleResizeUp} />}
  </section>;
}

function clamp(value: number, minimum: number, maximum: number) { return Math.min(Math.max(value, minimum), maximum); }
