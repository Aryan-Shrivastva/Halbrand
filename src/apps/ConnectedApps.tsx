import { useState, type FormEvent } from 'react';
import { profile, projects } from '@/data/content';

const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
const asUrl = (value: string) => /^https?:\/\//i.test(value) ? value : `https://${value}`;

export function SafariApp() {
  const [address, setAddress] = useState('https://www.google.com');
  const [lastOpened, setLastOpened] = useState('');
  const navigate = (event: FormEvent) => {
    event.preventDefault();
    const destination = address.trim();
    if (!destination) return;
    openExternal(asUrl(destination));
    setLastOpened(destination);
  };
  const favourite = (url: string) => { setAddress(url); openExternal(url); setLastOpened(url); };
  return <div className="utility-app connected-app safari-live"><form className="browser-toolbar" onSubmit={navigate}><button type="button" aria-label="Back" disabled>‹</button><button type="button" aria-label="Forward" disabled>›</button><label><span>⌕</span><input value={address} onChange={(event) => setAddress(event.target.value)} aria-label="Safari address or search" /></label><button type="submit" aria-label="Open address">↗</button></form><section className="connected-content"><p className="connected-eyebrow">SAFARI</p><h1>Browse the real web</h1><p>Enter a site and it opens in your browser, where its own account session and sign-in flow remain authentic.</p><div className="connected-actions"><button type="button" onClick={() => favourite('https://www.google.com')}>Google</button><button type="button" onClick={() => favourite(profile.socials.github)}>GitHub</button><button type="button" onClick={() => favourite(projects[0]?.liveUrl ?? 'https://github.com/')}>Projects</button></div>{lastOpened && <small>Opened <b>{lastOpened}</b> in a browser tab.</small>}</section></div>;
}

export function MapsApp() {
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState(false);
  const openMaps = (event?: FormEvent) => {
    event?.preventDefault();
    const url = query.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}` : 'https://www.google.com/maps';
    openExternal(url);
    setOpened(true);
  };
  const signIn = () => { openExternal('https://accounts.google.com/ServiceLogin?service=maps&continue=https%3A%2F%2Fwww.google.com%2Fmaps'); setOpened(true); };
  return <div className="utility-app connected-app maps-live"><section className="connected-content"><p className="connected-eyebrow">GOOGLE MAPS</p><h1>Open Maps with your Google account</h1><p>Maps runs in the real Google Maps tab, so saved places, timeline, and sign-in are handled by Google—not copied into this portfolio.</p><form className="connected-search" onSubmit={openMaps}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a place or address" aria-label="Search Google Maps" /><button type="submit">Search Maps</button></form><div className="connected-actions"><button type="button" className="primary-action" onClick={signIn}>Continue with Google</button><button type="button" onClick={() => openMaps()}>Open Google Maps</button></div>{opened && <small>Your Google Maps tab has opened. Sign in there to use your own account.</small>}</section></div>;
}

export function XApp() {
  const [started, setStarted] = useState(false);
  const signIn = () => { openExternal('https://x.com/i/flow/login'); setStarted(true); };
  return <div className="utility-app connected-app x-live"><section className="connected-content"><p className="connected-eyebrow">𝕏</p><h1>Continue with your X account</h1><p>Your account is kept with X. Sign in through its official page, then use the real X tab with your existing session.</p><div className="connected-actions"><button type="button" className="primary-action" onClick={signIn}>Sign in with X</button><button type="button" onClick={() => { openExternal('https://x.com/home'); setStarted(true); }}>Open X</button></div>{started && <small>X has opened in a browser tab. Complete sign-in there to reach your account.</small>}<footer className="connected-note">A later OAuth integration can securely bring approved profile/activity data back into this portfolio.</footer></section></div>;
}
