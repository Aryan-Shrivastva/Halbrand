import { useMemo, useState } from 'react';
import { profile, projects } from '@/data/content';
import type { AppId } from '@/os/types';

const items = [
  { name: 'Projects', kind: 'folder', detail: 'Portfolio work and case studies' },
  { name: 'About Me.md', kind: 'note', detail: 'A short introduction' },
  { name: 'Resume.pdf', kind: 'pdf', detail: 'Resume placeholder — add your PDF later' },
  { name: 'Contact.txt', kind: 'text', detail: profile.email },
];

export function FinderApp() {
  const [location, setLocation] = useState('Desktop');
  const [selected, setSelected] = useState('Projects');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const active = items.find((item) => item.name === selected) ?? items[0];
  const open = (name: string) => {
    setSelected(name);
    if (name === 'Projects') { setLocation('Projects'); return; }
    const target: AppId | null = name.endsWith('.md') || name.endsWith('.txt') ? 'notes' : name.endsWith('.pdf') ? 'safari' : null;
    if (target) window.dispatchEvent(new CustomEvent<AppId>('portfolio:launch-app', { detail: target }));
  };
  return <>
    <div className="app-toolbar finder-toolbar"><div className="finder-nav"><button type="button" onClick={() => setLocation('Desktop')}>‹</button><button type="button" onClick={() => setLocation('Projects')}>›</button></div><strong>{location}</strong><label className="search-box finder-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search Finder" /></label></div>
    <div className="finder-body"><aside className="finder-sidebar"><p>FAVORITES</p><button type="button" onClick={() => setLocation('Desktop')}>▦&nbsp; Desktop</button><button type="button" onClick={() => setLocation('Documents')}>▱&nbsp; Documents</button><button type="button" onClick={() => setLocation('Projects')}>▰&nbsp; Projects</button><button type="button" onClick={() => setSelected('Resume.pdf')}>⇩&nbsp; Downloads</button><p>LOCATIONS</p><button type="button">◈&nbsp; {profile.name}&apos;s Mac</button></aside><section className="finder-content"><div className="finder-grid">{visible.map((item) => <button key={item.name} type="button" className={`finder-item${selected === item.name ? ' selected' : ''}`} onClick={() => setSelected(item.name)} onDoubleClick={() => open(item.name)}><span className={`finder-art ${item.kind}`} aria-hidden="true">{item.kind === 'folder' ? '▰' : item.kind === 'pdf' ? 'PDF' : item.kind === 'note' ? '✎' : 'TXT'}</span><span>{item.name}</span></button>)}{location === 'Projects' && projects.map((project) => <button type="button" className="finder-item" key={project.slug} onClick={() => setSelected('Projects')}><span className="finder-art folder">▰</span><span>{project.name}</span></button>)}</div><div className="finder-inspector"><h2>{active.name}</h2><p>{active.detail}</p>{selected === 'Projects' && <><span>{projects.length} portfolio project</span><button type="button" onClick={() => setLocation('Projects')}>Open Projects</button></>}</div></section></div>
    <footer className="app-footer finder-footer"><span>{visible.length} items</span><span>{location}</span></footer>
  </>;
}
