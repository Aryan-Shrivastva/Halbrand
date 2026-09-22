import { useRef, useState, type KeyboardEvent } from 'react';
import { achievements, experience, profile, projects, skills } from '@/data/content';
import type { AppId } from '@/os/types';
import type { Theme } from '@/os/stores/systemStore';

const appAliases: Record<string, AppId> = { finder: 'finder', notes: 'notes', terminal: 'terminal', safari: 'safari', messages: 'messages', maps: 'maps', photos: 'photos', calendar: 'calendar', code: 'vscode', vscode: 'vscode', x: 'x', settings: 'settings', trash: 'trash' };
const allCommands = ['about', 'achievements', 'cat', 'cd', 'clear', 'contact', 'date', 'echo', 'experience', 'gsoc', 'help', 'history', 'ls', 'neofetch', 'open', 'project', 'projects', 'pwd', 'resume', 'skills', 'socials', 'sudo', 'theme', 'whoami'];
const virtualDirectories: Record<string, string[]> = {
  '~': ['aboutme/', 'projects/', 'skills/', 'socials/', 'experience.txt', 'achievements.txt', 'resume.pdf'],
  '~/aboutme': ['bio.txt', 'stack.txt', 'now.txt'],
  '~/projects': projects.map((project) => `${project.slug}.md`),
  '~/skills': ['frontend.txt', 'tools.txt'],
  '~/socials': ['github.url', 'linkedin.url'],
};
type CommandResult = { lines: string[]; launch?: AppId; cwd?: string; openUrl?: string };

export function TerminalApp() {
  const [lines, setLines] = useState<string[]>(['Last login: today on ttys001', 'Type "help" to explore this portfolio.']);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [cwd, setCwd] = useState('~');
  const inputRef = useRef<HTMLInputElement>(null);
  const prompt = `guest@portfolio ${cwd} %`;
  const run = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;
    const [command, ...argumentsList] = trimmed.split(/\s+/);
    const normalized = command.toLowerCase();
    const argument = argumentsList.join(' ');
    if (normalized === 'theme' && (argument === 'dark' || argument === 'light' || argument === 'auto')) window.dispatchEvent(new CustomEvent<Theme>('portfolio:set-theme', { detail: argument }));
    const result = commandResult(normalized, argument, cwd, commandHistory);
    if (result.launch) window.dispatchEvent(new CustomEvent<AppId>('portfolio:launch-app', { detail: result.launch }));
    if (result.openUrl) window.open(result.openUrl, '_blank', 'noopener,noreferrer');
    if (result.cwd) setCwd(result.cwd);
    setCommandHistory((current) => [...current, trimmed]);
    setHistoryIndex(null);
    setLines((current) => normalized === 'clear' ? [] : [...current, `${prompt} ${trimmed}`, ...result.lines]);
    setInput('');
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { run(input); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); const next = historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1); if (next >= 0) { setHistoryIndex(next); setInput(commandHistory[next]); } return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); if (historyIndex === null) return; const next = historyIndex + 1; if (next >= commandHistory.length) { setHistoryIndex(null); setInput(''); } else { setHistoryIndex(next); setInput(commandHistory[next]); } return; }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); setLines([]); return; }
    if (event.ctrlKey && event.key.toLowerCase() === 'c') { event.preventDefault(); setLines((current) => [...current, '^C']); setInput(''); return; }
    if (event.key === 'Tab') { event.preventDefault(); const [first, second] = input.toLowerCase().split(/\s+/, 2); if (!second) { const match = allCommands.find((entry) => entry.startsWith(first)); if (match) setInput(match); } else { const match = (virtualDirectories[cwd] ?? []).find((entry) => entry.startsWith(second)); if (match) setInput(`${first} ${match.replace(/\/$/, '')}`); } }
  };
  return <div className="terminal-app" onClick={() => inputRef.current?.focus()}>{lines.map((line, index) => <p key={`${line}-${index}`} className={line.startsWith('guest@') ? 'terminal-prompt' : line.startsWith('Portfolio') ? 'terminal-heading' : ''}>{line}</p>)}<label className="terminal-entry"><span>{prompt}</span><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} aria-label="Terminal command" autoFocus /></label></div>;
}

function commandResult(command: string, argument: string, cwd: string, history: string[]): CommandResult {
  if (command === 'help') return { lines: ['Standard shell: ls [path], cd <directory>, pwd, cat <file>, history, clear.', 'Portfolio: about, projects, project <name>, skills, experience, gsoc, achievements, contact, socials, resume, open <app>.', 'Try: projects  ·  project pitwolf  ·  experience  ·  gsoc'] };
  if (command === 'about') return { lines: [profile.bio, `${profile.role} · ${profile.location}`].filter(Boolean) };
  if (command === 'projects') return { lines: projects.map((project, index) => `${index + 1}. ${project.name} — ${project.tagline}`) };
  if (command === 'project') { const project = projects.find((entry, index) => entry.slug === argument.toLowerCase() || entry.name.toLowerCase() === argument.toLowerCase() || String(index + 1) === argument); return { lines: project ? [`${project.name} (${project.year})`, project.description, `Stack: ${project.stack.join(' · ')}`, ...(project.liveUrl ? [`Live: ${project.liveUrl}`] : []), ...(project.repoUrl ? [`Source: ${project.repoUrl}`] : [])] : ['Usage: project <name or number>'] }; }
  if (command === 'skills') return { lines: Object.entries(skills).map(([group, entries]) => `${group}: ${entries.join(' · ')}`) };
  if (command === 'experience') return { lines: experience.flatMap((entry) => [`${entry.role} · ${entry.organization}`, `${entry.period}${entry.location ? ` · ${entry.location}` : ''}`, ...entry.highlights.map((highlight) => `  • ${highlight}`), '']) };
  if (command === 'gsoc') { const contribution = experience.find((entry) => entry.organization.includes('Google Summer of Code')); return { lines: contribution ? [`${contribution.organization} · ${contribution.period}`, ...contribution.highlights.map((highlight) => `• ${highlight}`)] : ['GSoC contribution details are not available yet.'] }; }
  if (command === 'achievements') return { lines: achievements.map((achievement) => `• ${achievement}`) };
  if (command === 'contact') return { lines: [`GitHub: ${profile.socials.github}`, `LinkedIn: ${profile.socials.linkedin}`, `X: ${profile.socials.x}`] };
  if (command === 'socials') return { lines: Object.entries(profile.socials).map(([name, url]) => `${name}: ${url}`) };
  if (command === 'whoami') return { lines: ['guest'] };
  if (command === 'date') return { lines: [new Date().toString()] };
  if (command === 'echo') return { lines: [argument] };
  if (command === 'history') return { lines: history.length ? history.map((entry, index) => `${index + 1}  ${entry}`) : ['No command history yet.'] };
  if (command === 'neofetch') return { lines: ['Portfolio Desktop', '-----------------', `${profile.role}`, 'React · TypeScript · Vite', 'Virtual filesystem: online', `Location: ${profile.location}`] };
  if (command === 'pwd') return { lines: [cwd] };
  if (command === 'ls') return listDirectory(argument, cwd);
  if (command === 'cd') return changeDirectory(argument, cwd);
  if (command === 'cat') return readFile(argument, cwd);
  if (command === 'resume') return { lines: ['Opening Aryan_Resume.pdf…'], openUrl: '/resume.pdf' };
  if (command === 'open') { const app = appAliases[argument.toLowerCase()]; const project = projects.find((entry) => entry.slug === argument.toLowerCase() || entry.name.toLowerCase() === argument.toLowerCase()); return app ? { lines: [`Opening ${argument}…`], launch: app } : project && (project.liveUrl || project.repoUrl) ? { lines: [`Opening ${project.name}…`], openUrl: project.liveUrl ?? project.repoUrl } : { lines: [`open: unknown app or project: ${argument}`] }; }
  if (command === 'theme') return argument === 'dark' || argument === 'light' || argument === 'auto' ? { lines: [`Theme changed to ${argument}.`], launch: 'settings' as AppId } : { lines: ['Usage: theme <dark|light|auto>'] };
  if (command === 'sudo') return { lines: ['guest is not in the sudoers file. This incident will be reported.'] };
  if (command === 'rm' && argument === '-rf /') return { lines: ['Nice try. This desktop values its files.'] };
  if (command === 'clear') return { lines: [] };
  return { lines: [`zsh: command not found: ${command}`] };
}

function listDirectory(argument: string, cwd: string) {
  const target = resolvePath(cwd, argument.replace(/^-\w+\s*/, '') || '.');
  if (virtualDirectories[target]) return { lines: [virtualDirectories[target].join('  ')] };
  if (fileContents(target)) return { lines: [target.split('/').at(-1) ?? target] };
  return { lines: [`ls: ${argument}: No such file or directory`] };
}

function changeDirectory(argument: string, cwd: string) {
  const target = resolvePath(cwd, argument || '~');
  return virtualDirectories[target] ? { lines: [], cwd: target } : { lines: [`cd: no such file or directory: ${argument}`] };
}

function readFile(argument: string, cwd: string) {
  const target = resolvePath(cwd, argument);
  const contents = fileContents(target);
  if (contents) return { lines: contents };
  if (virtualDirectories[target]) return { lines: [`cat: ${argument}: Is a directory`] };
  return { lines: [`cat: ${argument}: No such file`] };
}

function resolvePath(cwd: string, rawPath: string) {
  const path = rawPath.trim();
  if (!path || path === '.') return cwd;
  if (path === '~' || path === '/') return '~';
  if (path === '..') return cwd === '~' ? '~' : cwd.slice(0, cwd.lastIndexOf('/')) || '~';
  if (path.startsWith('~/')) return `~/${path.slice(2).replace(/\/$/, '')}`;
  return `${cwd === '~' ? '~' : cwd}/${path}`.replace(/\/$/, '');
}

function fileContents(path: string): string[] | null {
  if (path === '~/aboutme/bio.txt') return [profile.bio];
  if (path === '~/aboutme/stack.txt') return [Object.entries(skills).map(([group, entries]) => `${group}: ${entries.join(', ')}`).join(' | ')];
  if (path === '~/aboutme/now.txt') return ['Building an interactive desktop portfolio in the browser.'];
  if (path === '~/skills/frontend.txt') return [skills.Frontend?.join(' · ') ?? ''];
  if (path === '~/skills/tools.txt') return [skills.Tools?.join(' · ') ?? ''];
  if (path === '~/contact.txt') return [profile.email];
  if (path === '~/experience.txt') return experience.flatMap((entry) => [`${entry.role} · ${entry.organization} (${entry.period})`, ...entry.highlights.map((highlight) => `- ${highlight}`), '']);
  if (path === '~/achievements.txt') return achievements;
  if (path === '~/socials/github.url') return [profile.socials.github];
  if (path === '~/socials/linkedin.url') return [profile.socials.linkedin];
  if (path === '~/resume.pdf') return ['Resume placeholder. Add public/resume.pdf when ready.'];
  const project = projects.find((entry) => path === `~/projects/${entry.slug}.md`);
  return project ? [project.name, project.description, `Stack: ${project.stack.join(', ')}`] : null;
}
