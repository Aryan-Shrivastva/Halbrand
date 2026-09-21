import { useCallback, useEffect, useState } from 'react';
import { Desktop } from '@/os/components/Desktop/Desktop';
import { BootScreen } from '@/os/components/BootScreen/BootScreen';
import { useSystemStore } from '@/os/stores/systemStore';
import { PlainPortfolio } from '@/plain/PlainPortfolio';

export default function App() {
  const { theme, setTheme, boot, setBoot } = useSystemStore();
  const [compactViewport, setCompactViewport] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolved = theme === 'auto' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setCompactViewport(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    try {
      const bootSeen = Number(window.localStorage.getItem('bootSeen'));
      if (boot === 'off' && Date.now() - bootSeen < 86_400_000) setBoot('ready');
    } catch {
      // A full boot is used when localStorage is unavailable.
    }
  }, [boot, setBoot]);

  const start = useCallback(() => setBoot('booting'), [setBoot]);
  const ready = useCallback(() => {
    try { window.localStorage.setItem('bootSeen', String(Date.now())); } catch { /* optional persistence */ }
    setBoot('ready');
  }, [setBoot]);

  if (window.location.pathname === '/plain' || compactViewport) return <PlainPortfolio />;
  if (boot !== 'ready') return <BootScreen state={boot} onStart={start} onReady={ready} />;
  return <Desktop theme={theme} onThemeChange={setTheme} />;
}
