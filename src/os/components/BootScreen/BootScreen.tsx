import { useEffect } from 'react';
import type { BootState } from '@/os/stores/systemStore';

interface BootScreenProps {
  state: BootState;
  onStart: () => void;
  onReady: () => void;
}

export function BootScreen({ state, onStart, onReady }: BootScreenProps) {
  useEffect(() => {
    if (state !== 'booting') return;
    const timer = window.setTimeout(onReady, 2300);
    return () => window.clearTimeout(timer);
  }, [onReady, state]);
  useEffect(() => {
    if (state !== 'sleeping') return;
    const wake = () => onReady();
    window.addEventListener('keydown', wake, { once: true });
    window.addEventListener('pointerdown', wake, { once: true });
    return () => { window.removeEventListener('keydown', wake); window.removeEventListener('pointerdown', wake); };
  }, [onReady, state]);

  if (state === 'off') return <main className="boot-screen power-screen"><button type="button" className="power-button" onClick={onStart} aria-label="Start portfolio desktop"><span>⏻</span><strong>Click to start</strong><small>Portfolio Desktop</small></button></main>;
  if (state === 'shutdown') return <main className="boot-screen power-screen"><button type="button" className="power-button" onClick={onStart} aria-label="Start portfolio desktop"><span>⏻</span><strong>Shut Down</strong><small>Click the power button to start</small></button></main>;
  if (state === 'sleeping') return <main className="boot-screen sleep-screen"><div><span className="sleep-mark">◆</span><p>Sleeping</p><small>Click or press any key to wake</small></div></main>;
  return <main className="boot-screen booting-screen"><div className="boot-mark">◆</div><div className="boot-progress"><span /></div><button type="button" className="boot-skip" onClick={onReady}>Skip</button></main>;
}
