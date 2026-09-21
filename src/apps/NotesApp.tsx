import { useEffect, useMemo, useState } from 'react';
import { profile } from '@/data/content';

type PortfolioNote = { id: string; title: string; preview: string; date: string; body: string; editable?: boolean; deleted?: boolean };
const seededNotes: PortfolioNote[] = [
  { id: 'about', title: `About ${profile.name}`, preview: 'A developer who cares about clear, useful systems.', date: 'Today, 3:38 PM', body: `Hey, I'm ${profile.name} — ${profile.role.toLowerCase()} with a love for clear UI, efficient systems, and expressive code.\n\nI work across the stack using React, TypeScript, APIs, and thoughtful design systems.\n\nWhether it's building a smooth interaction or designing a useful API, I enjoy turning ideas into thoughtful software.` },
  { id: 'projects', title: 'My Projects', preview: 'A few things I am proud to have built.', date: 'Apr 21, 2025', body: 'Desktop Portfolio\n\nAn interactive operating-system-inspired portfolio designed around discovery and delightful details.' },
  { id: 'love', title: 'What I Love', preview: 'Small details, good coffee, and big ideas.', date: 'Apr 20, 2025', body: 'Small details, good coffee, and big ideas. The best products make complex work feel calm.' },
  { id: 'ideas', title: 'Ideas to explore', preview: 'Things worth learning next.', date: 'Apr 17, 2025', body: 'Live portfolio data, useful automations, and interfaces that feel like real tools.' },
];

export function NotesApp() {
  const [notes, setNotes] = useState(() => [...seededNotes, ...readUserNotes()]);
  const [selectedId, setSelectedId] = useState('about');
  const [query, setQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  useEffect(() => {
    try { window.localStorage.setItem('notes:v1', JSON.stringify(notes.filter((note) => note.editable))); } catch { /* Persistence is optional in restrictive browser contexts. */ }
  }, [notes]);
  const visible = useMemo(() => notes.filter((note) => Boolean(note.deleted) === showDeleted && `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase())), [notes, query, showDeleted]);
  const selected = notes.find((note) => note.id === selectedId) ?? visible[0] ?? notes[0];
  const create = () => { const note = { id: `note-${Date.now()}`, title: 'New Note', preview: 'No additional text', date: 'Now', body: '', editable: true }; setNotes((current) => [note, ...current]); setSelectedId(note.id); setShowDeleted(false); };
  const update = (key: 'title' | 'body', value: string) => setNotes((current) => current.map((note) => note.id === selected.id ? { ...note, [key]: value, preview: key === 'body' ? value.slice(0, 54) || 'No additional text' : note.preview } : note));
  const remove = () => { if (!selected || !selected.editable) return; setNotes((current) => current.map((note) => note.id === selected.id ? { ...note, deleted: true } : note)); setSelectedId('about'); };
  return <>
    <div className="app-toolbar notes-app-toolbar"><div className="toolbar-controls"><button type="button" onClick={() => setShowDeleted((current) => !current)}>⌄</button><button type="button" onClick={create} aria-label="New note">＋</button><button type="button" onClick={remove} disabled={!selected?.editable} aria-label="Delete note">♙</button></div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search notes" /></label></div>
    <div className="notes-body"><aside className="notes-sidebar"><SectionTitle>FOLDERS <span>＋</span></SectionTitle><nav aria-label="Note folders"><Folder name="Notes" count={String(notes.filter((note) => !note.deleted).length)} onClick={() => setShowDeleted(false)} /><Folder name="Work" count="1" onClick={() => setShowDeleted(false)} /><Folder name="Personal" count="1" onClick={() => setShowDeleted(false)} /></nav><SectionTitle>SMART FOLDERS</SectionTitle><nav aria-label="Smart folders"><Folder name="Recently Deleted" icon="◷" onClick={() => setShowDeleted(true)} /><Folder name="Favorites" icon="♡" onClick={() => setShowDeleted(false)} /><Folder name="Tags" icon="◇" onClick={() => setShowDeleted(false)} /></nav></aside><section className="note-list" aria-label="All notes"><p className="list-heading">{showDeleted ? 'Recently Deleted' : 'All Notes'}</p>{visible.map((note) => <button key={note.id} className={`note-card${note.id === selected?.id ? ' selected' : ''}`} type="button" onClick={() => setSelectedId(note.id)}><strong>{note.title}</strong><span>{note.preview}</span><time>{note.date}</time></button>)}</section><article className="note-content">{selected?.editable ? <><input className="note-title-input" value={selected.title} onChange={(event) => update('title', event.target.value)} aria-label="Note title" /><time>{selected.date}</time><textarea value={selected.body} onChange={(event) => update('body', event.target.value)} placeholder="Start writing…" aria-label="Note body" /></> : <><h1>{selected?.title}</h1><time>{selected?.date}</time>{selected?.body.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</>}</article></div>
    <footer className="app-footer notes-footer"><span>{visible.length} notes</span><span>{selected?.editable ? 'Editing' : 'Viewing'}</span></footer>
  </>;
}

function SectionTitle({ children }: { children: React.ReactNode }) { return <p className="section-title">{children}</p>; }
function Folder({ name, count, icon = '▱', onClick }: { name: string; count?: string; icon?: string; onClick: () => void }) { return <button className="folder-row" type="button" onClick={onClick}><span><i aria-hidden="true">{icon}</i>{name}</span>{count && <em>{count}</em>}</button>; }

function readUserNotes(): PortfolioNote[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem('notes:v1') ?? '[]');
    return Array.isArray(saved) ? saved.filter((note): note is PortfolioNote => typeof note?.id === 'string' && note.editable === true) : [];
  } catch {
    return [];
  }
}
