export interface Project {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  stack: string[];
  liveUrl?: string;
  repoUrl?: string;
  year: number;
  framable?: boolean;
}

export interface Note {
  id: string;
  folder: string;
  title: string;
  body: string;
  createdAt: string;
}

export const profile = {
  name: 'Your Name',
  role: 'Software Developer',
  bio: 'I build thoughtful digital products and useful developer experiences.',
  location: 'India',
  email: 'hello@example.com',
  socials: {
    github: 'https://github.com/',
    linkedin: 'https://linkedin.com/',
  },
};

export const projects: Project[] = [
  {
    slug: 'desktop-portfolio',
    name: 'Desktop Portfolio',
    tagline: 'A portfolio that behaves like an operating system.',
    description: 'An interactive macOS-inspired portfolio for exploring my work.',
    stack: ['React', 'TypeScript', 'Tailwind CSS'],
    year: 2026,
  },
];

export const skills: Record<string, string[]> = {
  Frontend: ['React', 'TypeScript', 'Tailwind CSS'],
  Tools: ['Git', 'Vite'],
};

export const notes: Note[] = [
  {
    id: 'about',
    folder: 'Notes',
    title: 'About Me',
    body: 'This portfolio is being built as an interactive desktop experience.',
    createdAt: '2026-09-21',
  },
];
