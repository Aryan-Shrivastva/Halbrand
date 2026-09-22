export interface Project { slug: string; name: string; tagline: string; description: string; stack: string[]; liveUrl?: string; repoUrl?: string; year: number; framable?: boolean; }
export interface Note { id: string; folder: string; title: string; body: string; createdAt: string; }
export interface Experience { organization: string; role: string; period: string; location?: string; highlights: string[]; }

export const profile = {
  name: 'Aryan Shrivastva', role: 'Software Developer',
  bio: '',
  location: 'Gurgaon, Haryana', email: '',
  socials: { github: 'https://github.com/Aryan-Shrivastva', linkedin: 'https://www.linkedin.com/in/aryanshriv/', x: 'https://x.com/aryanshriv09', gitlab: 'https://gitlab.com/Aryan-Shrivastva' },
};

export const projects: Project[] = [
  { slug: 'pitwolf', name: 'PitWolf', tagline: 'Energy and overtake intelligence for Formula 1 strategy.', description: 'A Formula 1 race-strategy decision engine that learns overtake patterns from historical data, models energy deployment under 2026 rules, and replays completed races to evaluate ATTACK, SAVE, DELAY, or BOX recommendations.', stack: ['React', 'Vite', 'Node.js', 'FastF1', 'Supabase', 'Telemetry', 'Machine Learning'], repoUrl: 'https://github.com/Aryan-Shrivastva/PitWolf', year: 2026 },
  { slug: 'pitwall-copilot', name: 'Pitwall Copilot', tagline: 'F1 radio intelligence for driver and engineer communication.', description: 'An immersive F1 cockpit interface that turns unstructured driver and engineer radio messages into concise, race-ready information, with deterministic local fallbacks and optional Hugging Face classification.', stack: ['Python', 'JavaScript', 'React', 'Node.js', 'Hugging Face', 'NLP', 'REST APIs'], liveUrl: 'https://pitwall-copilot.vercel.app', repoUrl: 'https://github.com/Aryan-Shrivastva/Pitwall-Copilot', year: 2026 },
  { slug: 'jobradar', name: 'JobRadar', tagline: 'AI Telegram job discovery and application assistant.', description: 'A Telegram-based assistant that extracts unstructured job posts, matches them against a resume profile, deduplicates results with graph intelligence, and sends private job-alert cards with application tracking.', stack: ['Python', 'Neo4j', 'Notion MCP', 'Telegram', 'GitHub Actions', 'React', 'Vite'], liveUrl: 'https://gdg-interface.vercel.app', repoUrl: 'https://github.com/Aryan-Shrivastva/gdg_interface', year: 2026 },
];

export const skills: Record<string, string[]> = {
  Languages: ['Python', 'C++', 'Go', 'Dart', 'JavaScript', 'TypeScript', 'SQL', 'Rust', 'Java'],
  Frameworks: ['Node.js', 'Next.js', 'Flutter', 'React', 'FastAPI', 'Express'],
  Databases: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'],
  DeveloperTools: ['Git', 'Docker', 'Linux', 'Bash', 'AWS', 'EC2', 'Lambda', 'Postman', 'Nginx'],
  Libraries: ['http', 'Provider', 'axios', 'express', 'net/http', 'context', 'pandas', 'NumPy'],
};

export const experience: Experience[] = [
  { organization: 'ViniBrawn Health Care Solutions', role: 'Software Developer Intern', period: 'September 2025 - February 2026', location: 'Gurgaon, Haryana', highlights: ['Architected and built a Flutter application frontend with end-to-end user flows, core screens, and reusable interactive components.', 'Integrated backend APIs and Razorpay payments to support application services, payment flows, and transaction processing.', 'Implemented database queries for reliable user-specific retrieval and management across application workflows.'] },
  { organization: 'Google Summer of Code / Open Source', role: 'Open-Source Contributor', period: 'October 2025 - Present', highlights: ['Extended case-based programming blocks with comparison operators while preserving selections across block mutations. (#4)', 'Redesigned continuation test blocks with checkbox-based case selection and compatible saved-workspace reloads. (#5)', 'Fixed empty-main-block parsing and added regression tests for valid Python-code generation. (#8)', 'Expanded integration coverage across lexer, parser, type checking, resolution, control flow, and module loading with 20+ compiler error cases. (#772)'] },
];

export const achievements = ['Won the Notion x GDG hackathon at IIIT Delhi.', 'LeetCode: Global ranks 1477/30k and 1916/35k in Weekly Contests 508 and 500.', 'CodeChef: Global ranks 366/50k and 890/40k in Starters 227 and 237; 379/10k in DSA Challenge 015.'];
export const notes: Note[] = [{ id: 'about', folder: 'Notes', title: 'About Me', body: profile.bio, createdAt: '2026-09-22' }, { id: 'projects', folder: 'Work', title: 'Selected Projects', body: projects.map((project) => `${project.name}: ${project.tagline}`).join('\n\n'), createdAt: '2026-09-22' }];
