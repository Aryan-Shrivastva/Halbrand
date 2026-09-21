import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent, type WheelEvent } from 'react';
import { FinderApp } from '@/apps/FinderApp';
import { NotesApp } from '@/apps/NotesApp';
import { TerminalApp } from '@/apps/TerminalApp';
import { CalendarApp, MessagesApp, PhotosApp, SettingsApp, TrashApp, VSCodeApp } from '@/apps/UtilityApps';
import { MapsApp, SafariApp, XApp } from '@/apps/ConnectedApps';
import { apps, dockAppIds } from '@/os/registry';
import { notes, projects } from '@/data/content';
import { WindowFrame } from '@/os/components/Window/WindowFrame';
import { useProcessStore } from '@/os/stores/processStore';
import { useWindowStore } from '@/os/stores/windowStore';
import type { AppId } from '@/os/types';
import { useSystemStore, type Theme } from '@/os/stores/systemStore';

interface DesktopProps { theme: Theme; onThemeChange: (theme: Theme) => void; }
const themes: Theme[] = ['dark', 'light', 'auto'];
const desktopItems: Array<{ label: string; appId: AppId; kind: string }> = [
  { label: 'Projects', appId: 'finder', kind: 'folder' },
  { label: 'Resume.pdf', appId: 'finder', kind: 'document' },
  { label: 'About Me', appId: 'notes', kind: 'profile' },
];
type SpotlightResult = { id: string; label: string; detail: string; category: 'Application' | 'Project' | 'Note' | 'Terminal'; appId: AppId };
const terminalSuggestions = ['help', 'ls aboutme', 'cat aboutme/bio.txt', 'projects', 'neofetch'];
const extraDockApps = [
  { name: 'App Store', icon: '/local-macos/app-store.png' },
  { name: 'Google Chrome', icon: '/local-macos/chrome.png' },
  { name: 'GitHub', icon: '/local-macos/github.png' },
  { name: 'Instagram', icon: '/local-macos/instagram.png' },
  { name: 'Netflix', icon: '/local-macos/netflix.png' },
  { name: 'Spotify', icon: '/local-macos/spotify.png' },
  { name: 'WhatsApp', icon: '/local-macos/whatsapp.png' },
  { name: 'OBS Studio', icon: '/local-macos/obs.png' },
];

export function Desktop({ theme, onThemeChange }: DesktopProps) {
  const currentThemeIndex = themes.indexOf(theme);
  const [selectedDesktopItem, setSelectedDesktopItem] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [openMenu, setOpenMenu] = useState<'apple' | 'app' | 'window' | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showForceQuit, setShowForceQuit] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const launchProcess = useProcessStore((state) => state.launch);
  const quitProcess = useProcessStore((state) => state.quit);
  const resetProcesses = useProcessStore((state) => state.reset);
  const runningApps = useProcessStore((state) => state.running);
  const windows = useWindowStore((state) => state.windows);
  const zOrder = useWindowStore((state) => state.zOrder);
  const focusedWindowId = useWindowStore((state) => state.focusedWindowId);
  const openWindow = useWindowStore((state) => state.open);
  const restoreWindow = useWindowStore((state) => state.restore);
  const clearFocus = useWindowStore((state) => state.clearFocus);
  const closeWindow = useWindowStore((state) => state.close);
  const closeAllForApp = useWindowStore((state) => state.closeAllForApp);
  const minimizeWindow = useWindowStore((state) => state.minimize);
  const zoomWindow = useWindowStore((state) => state.toggleMaximize);
  const resetWindows = useWindowStore((state) => state.reset);
  const setBoot = useSystemStore((state) => state.setBoot);
  const [currentDesktop, setCurrentDesktop] = useState(1);
  const gesture = useRef<{ startX: number; currentX: number; count: number } | null>(null);
  const horizontalTravel = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeAppId = focusedWindowId && windows[focusedWindowId]?.spaceId === currentDesktop ? windows[focusedWindowId]?.appId ?? 'finder' : 'finder';
  const minimizedWindows = useMemo(() => zOrder.map((id) => windows[id]).filter((windowState) => windowState?.isMinimized), [windows, zOrder]);
  const visibleWindows = zOrder.map((id) => windows[id]).filter((windowState) => windowState && !windowState.isMinimized && windowState.spaceId === currentDesktop);
  const focusedAppId = focusedWindowId && windows[focusedWindowId]?.spaceId === currentDesktop ? windows[focusedWindowId]?.appId : null;
  const cycleTheme = () => onThemeChange(themes[(currentThemeIndex + 1) % themes.length]);
  const launchApp = useCallback((appId: AppId) => {
    const definition = apps[appId];
    const appWindows = Object.values(useWindowStore.getState().windows).filter((windowState) => windowState.appId === appId);
    launchProcess(appId);
    if (definition.singleInstance && appWindows[0]) {
      setCurrentDesktop(appWindows[0].spaceId);
      restoreWindow(appWindows[0].id);
      return;
    }
    const minimized = appWindows.find((windowState) => windowState.isMinimized);
    if (minimized) { restoreWindow(minimized.id); return; }
    openWindow(appId, currentDesktop);
  }, [currentDesktop, launchProcess, openWindow, restoreWindow]);
  useEffect(() => {
    const handleLaunchRequest = (event: Event) => {
      const appId = (event as CustomEvent<AppId>).detail;
      if (appId && apps[appId]) launchApp(appId);
    };
    window.addEventListener('portfolio:launch-app', handleLaunchRequest);
    return () => window.removeEventListener('portfolio:launch-app', handleLaunchRequest);
  }, [launchApp]);
  useEffect(() => {
    const handleThemeRequest = (event: Event) => {
      const nextTheme = (event as CustomEvent<Theme>).detail;
      if (themes.includes(nextTheme)) onThemeChange(nextTheme);
    };
    window.addEventListener('portfolio:set-theme', handleThemeRequest);
    return () => window.removeEventListener('portfolio:set-theme', handleThemeRequest);
  }, [onThemeChange]);
  const selectDesktopItem = (label: string, appId: AppId) => { setSelectedDesktopItem(label); launchApp(appId); };
  const activeWindow = focusedWindowId ? windows[focusedWindowId] : undefined;
  const quitActiveApp = useCallback(() => {
    if (activeAppId === 'finder') return;
    closeAllForApp(activeAppId);
    quitProcess(activeAppId);
  }, [activeAppId, closeAllForApp, quitProcess]);
  const restartDesktop = () => { resetWindows(); resetProcesses(); setCurrentDesktop(1); setOpenMenu(null); setBoot('booting'); };
  const sleepDesktop = () => { setOpenMenu(null); setBoot('sleeping'); };
  const shutdownDesktop = () => { resetWindows(); resetProcesses(); setOpenMenu(null); setBoot('shutdown'); };
  const switchDesktop = useCallback((direction: -1 | 1) => {
    setCurrentDesktop((current) => {
      const next = Math.min(4, Math.max(1, current + direction));
      if (next !== current) clearFocus();
      return next;
    });
  }, [clearFocus]);
  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 4) { gesture.current = null; return; }
    const x = averageTouchX(event.touches);
    gesture.current = { count: 4, startX: x, currentX: x };
  };
  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (!gesture.current || event.touches.length !== gesture.current.count) return;
    gesture.current.currentX = averageTouchX(event.touches);
  };
  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!gesture.current || event.touches.length) return;
    const delta = gesture.current.currentX - gesture.current.startX;
    gesture.current = null;
    if (Math.abs(delta) < 65) return;
    switchDesktop(delta > 0 ? 1 : -1);
  };
  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaX) < Math.abs(event.deltaY) || Math.abs(event.deltaX) < 3) return;
    horizontalTravel.current += event.deltaX;
    if (Math.abs(horizontalTravel.current) < 160) return;
    switchDesktop(horizontalTravel.current > 0 ? 1 : -1);
    horizontalTravel.current = 0;
  };
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target);
      const supportedCommand = ['KeyW', 'KeyM', 'KeyQ'].includes(event.code);
      if ((event.ctrlKey || event.metaKey) && supportedCommand && activeWindow) {
        event.preventDefault();
        if (event.code === 'KeyW') closeWindow(activeWindow.id);
        if (event.code === 'KeyM') minimizeWindow(activeWindow.id);
        if (event.code === 'KeyQ') quitActiveApp();
        return;
      }
      if (!event.altKey) {
        if (event.code === 'Slash' && !typing && !spotlightOpen) openSpotlight();
        return;
      }
      if (event.code === 'ArrowRight') { event.preventDefault(); switchDesktop(1); return; }
      if (event.code === 'ArrowLeft') { event.preventDefault(); switchDesktop(-1); return; }
      if (!activeWindow) return;
      if (event.code === 'KeyW') { event.preventDefault(); closeWindow(activeWindow.id); }
      if (event.code === 'KeyM') { event.preventDefault(); minimizeWindow(activeWindow.id); }
      if (event.code === 'KeyQ') { event.preventDefault(); quitActiveApp(); }
      if (event.code === 'KeyN' && activeAppId === 'terminal') { event.preventDefault(); launchApp('terminal'); }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [activeAppId, activeWindow, closeWindow, launchApp, minimizeWindow, quitActiveApp, spotlightOpen, switchDesktop]);
  useEffect(() => {
    const handleSpotlight = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyK') { event.preventDefault(); setSpotlightOpen(true); setSpotlightIndex(0); }
      if (event.code === 'Escape') { setSpotlightOpen(false); setOpenMenu(null); }
    };
    window.addEventListener('keydown', handleSpotlight);
    return () => window.removeEventListener('keydown', handleSpotlight);
  }, []);
  const spotlightResults = useMemo<SpotlightResult[]>(() => {
    const query = spotlightQuery.trim().toLowerCase();
    const matches = (value: string) => !query || value.toLowerCase().includes(query);
    return [
      ...Object.values(apps).filter((app) => matches(app.name)).map((app) => ({ id: `app-${app.id}`, label: app.name, detail: 'Open application', category: 'Application' as const, appId: app.id })),
      ...projects.filter((project) => matches(`${project.name} ${project.tagline}`)).map((project) => ({ id: `project-${project.slug}`, label: project.name, detail: project.tagline, category: 'Project' as const, appId: 'finder' as AppId })),
      ...notes.filter((note) => matches(`${note.title} ${note.body}`)).map((note) => ({ id: `note-${note.id}`, label: note.title, detail: 'Open in Notes', category: 'Note' as const, appId: 'notes' as AppId })),
      ...terminalSuggestions.filter((command) => matches(command)).map((command) => ({ id: `command-${command}`, label: command, detail: 'Run in Terminal', category: 'Terminal' as const, appId: 'terminal' as AppId })),
    ];
  }, [spotlightQuery]);
  const activateSpotlightResult = (result: SpotlightResult) => { launchApp(result.appId); setSpotlightOpen(false); setSpotlightQuery(''); setSpotlightIndex(0); };
  const openSpotlight = () => { setSpotlightOpen(true); setSpotlightIndex(0); };

  return <main className={`desktop-shell min-h-screen space-${currentDesktop}`} onPointerDown={(event) => { if (event.target === event.currentTarget) { setSelectedDesktopItem(null); clearFocus(); setOpenMenu(null); } }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
    <header className="menu-bar" role="banner">
      <button className="brand-mark" type="button" aria-label="Open system menu" onClick={() => setOpenMenu(openMenu === 'apple' ? null : 'apple')}></button><button className="menu-trigger app-menu-trigger" type="button" onClick={() => setOpenMenu(openMenu === 'app' ? null : 'app')}>{apps[activeAppId].name}</button><span>File</span><span>Edit</span><span>View</span><button className="menu-trigger" type="button" onClick={() => setOpenMenu(openMenu === 'window' ? null : 'window')}>Window</button><span>Help</span>
      <div className="menu-status"><span className="status-glyph status-user" aria-hidden="true">◉</span><span className="status-glyph status-control" aria-hidden="true">▣</span><span className="status-glyph status-volume" aria-hidden="true">◔</span><span className="status-glyph status-battery" aria-hidden="true">▰</span><span className="status-glyph status-wifi" aria-hidden="true">◌</span><button className="spotlight-trigger" type="button" aria-label="Open Spotlight" onClick={openSpotlight}>⌕</button><button className="control-centre" type="button" aria-label="Change colour theme" onClick={cycleTheme}>☷</button><span className="menu-clock">{formatMenuTime(now)}</span></div>
      {openMenu === 'app' && <div className="top-menu app-menu"><button type="button" onClick={() => setOpenMenu(null)}>About {apps[activeAppId].name}</button><span className="menu-separator" /><button type="button" disabled={!activeWindow} onClick={() => { if (activeWindow) minimizeWindow(activeWindow.id); setOpenMenu(null); }}>Hide {apps[activeAppId].name}<kbd>⌥M</kbd></button><button type="button" disabled={activeAppId === 'finder'} onClick={() => { quitActiveApp(); setOpenMenu(null); }}>Quit {apps[activeAppId].name}<kbd>⌥Q</kbd></button></div>}
      {openMenu === 'window' && <div className="top-menu window-menu"><button type="button" disabled={!activeWindow} onClick={() => { if (activeWindow) minimizeWindow(activeWindow.id); setOpenMenu(null); }}>Minimize<kbd>⌥M</kbd></button><button type="button" disabled={!activeWindow} onClick={() => { if (activeWindow) zoomWindow(activeWindow.id); setOpenMenu(null); }}>Zoom</button><span className="menu-separator" />{visibleWindows.map((windowState) => <button type="button" key={windowState.id} onClick={() => { restoreWindow(windowState.id); setOpenMenu(null); }}>{windowState.title}</button>)}</div>}
      {openMenu === 'apple' && <div className="top-menu apple-menu"><button type="button" onClick={() => { setShowAbout(true); setOpenMenu(null); }}>About This Portfolio</button><button type="button" onClick={() => { setOpenMenu(null); launchApp('settings'); }}>System Settings…</button><span className="menu-separator" /><button type="button" onClick={() => { setOpenMenu(null); launchApp('finder'); }}>Recent Items</button><button type="button" onClick={() => { setShowForceQuit(true); setOpenMenu(null); }}>Force Quit…</button><span className="menu-separator" /><button type="button" onClick={sleepDesktop}>Sleep</button><button type="button" onClick={restartDesktop}>Restart…</button><button type="button" onClick={shutdownDesktop}>Shut Down…</button></div>}
    </header>
    <nav className="desktop-icons" aria-label="Desktop items">
      {desktopItems.map(({ label, kind, appId }) => <button type="button" key={label} className={`desktop-item ${kind}${selectedDesktopItem === label ? ' selected' : ''}`} onClick={() => selectDesktopItem(label, appId)} aria-pressed={selectedDesktopItem === label}><span className="desktop-item-art" aria-hidden="true"><img src={apps[appId].icon} alt="" /></span><span>{label}</span></button>)}
    </nav>
    <aside className="desktop-widgets" aria-label="Portfolio widgets">
      <section className="widget widget-agenda"><div className="widget-date"><strong>{formatWeekday(now)}</strong><span>{now.getDate()}</span></div><div><p>UP NEXT</p><b>Portfolio polish</b><small>Today · focus block</small><span className="widget-event-dot" /> <small>Frontend review</small></div></section>
      <section className="widget widget-weather"><div><p>WORKSPACE</p><b>Build mode</b><small>Frontend foundation</small></div><strong>⌁</strong></section>
      <section className="widget widget-market"><header><b>PORTFOLIO PULSE</b><small>Preview</small></header><WidgetMetric label="GitHub" value="Connect later" tone="up" /><WidgetMetric label="LeetCode" value="Connect later" tone="flat" /><WidgetMetric label="CodeChef" value="Connect later" tone="down" /></section>
    </aside>
    {visibleWindows.map((windowState) => <WindowFrame windowState={windowState} key={windowState.id}>{renderApp(windowState.appId)}</WindowFrame>)}
    <nav className="dock" aria-label="Application dock">
      {dockAppIds.map((appId) => <button type="button" className={`dock-app ${appId}${focusedAppId === appId ? ' is-active' : ''}`} key={appId} aria-label={`Open ${apps[appId].name}`} title={apps[appId].name} onClick={() => launchApp(appId)}><img src={apps[appId].icon} alt="" /></button>)}
      {extraDockApps.length > 0 && <span className="dock-divider dock-extra-divider" aria-hidden="true" />}
      {extraDockApps.map((app) => <span className="dock-extra" key={app.name} title={app.name} aria-label={app.name}><img src={app.icon} alt="" /></span>)}
      {minimizedWindows.length > 0 && <span className="dock-divider" aria-hidden="true" />}
      {minimizedWindows.map((windowState) => <button type="button" className="dock-app minimized-window" key={windowState.id} aria-label={`Restore ${windowState.title}`} title={`Restore ${windowState.title}`} onClick={() => { setCurrentDesktop(windowState.spaceId); restoreWindow(windowState.id); }}><img src={apps[windowState.appId].icon} alt="" /></button>)}
      <span className="dock-divider" aria-hidden="true" /><button type="button" className="dock-app trash" aria-label="Open Trash" title="Trash" onClick={() => launchApp('trash')}><img src={apps.trash.icon} alt="" /></button>
    </nav>
    {spotlightOpen && <div className="spotlight-backdrop" role="presentation" onPointerDown={() => setSpotlightOpen(false)}><section className="spotlight-panel" role="dialog" aria-modal="true" aria-label="Spotlight" onPointerDown={(event) => event.stopPropagation()}><label><span>⌕</span><input value={spotlightQuery} onChange={(event) => { setSpotlightQuery(event.target.value); setSpotlightIndex(0); }} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setSpotlightIndex((index) => Math.min(index + 1, spotlightResults.length - 1)); } if (event.key === 'ArrowUp') { event.preventDefault(); setSpotlightIndex((index) => Math.max(index - 1, 0)); } if (event.key === 'Enter' && spotlightResults[spotlightIndex]) { event.preventDefault(); activateSpotlightResult(spotlightResults[spotlightIndex]); } }} placeholder="Spotlight Search" aria-label="Search desktop" autoFocus /></label><div className="spotlight-results">{spotlightResults.length > 0 ? spotlightResults.map((result, index) => <button type="button" className={index === spotlightIndex ? 'selected' : ''} key={result.id} onMouseEnter={() => setSpotlightIndex(index)} onClick={() => activateSpotlightResult(result)}>{result.category === 'Application' ? <span className={`spotlight-icon ${result.appId}`}><img src={apps[result.appId].icon} alt="" /></span> : <span className="spotlight-symbol" aria-hidden="true">{result.category === 'Project' ? '▰' : result.category === 'Note' ? '✎' : '›_'}</span>}<span><b>{result.label}</b><em>{result.detail}</em></span><small>{result.category}</small></button>) : <p className="spotlight-empty">No results</p>}</div><footer>↑↓ to select · Enter to open · Esc to close</footer></section></div>}
    {showAbout && <div className="system-modal-backdrop" role="presentation" onPointerDown={() => setShowAbout(false)}><section className="system-modal" role="dialog" aria-modal="true" aria-label="About This Portfolio" onPointerDown={(event) => event.stopPropagation()}><span className="about-mark">◆</span><h1>{profileName()}</h1><p>Interactive Portfolio Desktop</p><small>Built with React, TypeScript, and a macOS-inspired window system.</small><a href="/plain">View plain portfolio</a><button type="button" onClick={() => setShowAbout(false)}>Done</button></section></div>}
    {showForceQuit && <div className="system-modal-backdrop" role="presentation" onPointerDown={() => setShowForceQuit(false)}><section className="system-modal force-quit-modal" role="dialog" aria-modal="true" aria-label="Force Quit Applications" onPointerDown={(event) => event.stopPropagation()}><h1>Force Quit Applications</h1><p>If an app becomes unresponsive, select it and quit it.</p><div className="force-quit-list">{runningApps.filter((appId) => appId !== 'finder').length ? runningApps.filter((appId) => appId !== 'finder').map((appId) => <button type="button" key={appId} onClick={() => { closeAllForApp(appId); quitProcess(appId); }}>{apps[appId].name}<span>Quit</span></button>) : <small>No apps are currently running.</small>}</div><button type="button" onClick={() => setShowForceQuit(false)}>Done</button></section></div>}
  </main>;
}

function renderApp(appId: AppId) {
  if (appId === 'finder') return <FinderApp />;
  if (appId === 'terminal') return <TerminalApp />;
  if (appId === 'notes') return <NotesApp />;
  if (appId === 'safari') return <SafariApp />;
  if (appId === 'messages') return <MessagesApp />;
  if (appId === 'maps') return <MapsApp />;
  if (appId === 'photos') return <PhotosApp />;
  if (appId === 'calendar') return <CalendarApp />;
  if (appId === 'vscode') return <VSCodeApp />;
  if (appId === 'x') return <XApp />;
  if (appId === 'settings') return <SettingsApp />;
  return <TrashApp />;
}

function formatMenuTime(date: Date) { return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date); }
function formatWeekday(date: Date) { return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date).toUpperCase(); }
function profileName() { return 'Portfolio'; }
function isTypingTarget(target: EventTarget | null) { return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable); }
function averageTouchX(touches: { length: number; [index: number]: { clientX: number } }) { let total = 0; for (let index = 0; index < touches.length; index += 1) total += touches[index].clientX; return total / Math.max(touches.length, 1); }

function WidgetMetric({ label, value, tone }: { label: string; value: string; tone: 'up' | 'flat' | 'down' }) {
  return <div className="widget-metric"><span>{label}</span><i className={tone} aria-hidden="true">╱╲</i><b>{value}</b></div>;
}
