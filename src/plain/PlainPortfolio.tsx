import { profile, projects, skills } from '@/data/content';

export function PlainPortfolio() {
  return <main className="plain-portfolio">
    <header className="plain-hero">
      <a href="/" aria-label="Return to interactive desktop">← Interactive desktop</a>
      <p>PORTFOLIO</p>
      <h1>{profile.name}</h1>
      <h2>{profile.role}</h2>
      <p className="plain-intro">{profile.bio}</p>
      <div className="plain-links"><a href={`mailto:${profile.email}`}>{profile.email}</a><a href={profile.socials.github}>GitHub</a><a href={profile.socials.linkedin}>LinkedIn</a></div>
    </header>
    <section aria-labelledby="projects"><p className="plain-kicker">SELECTED WORK</p><h2 id="projects">Projects</h2><div className="plain-projects">{projects.map((project) => <article key={project.slug}><div><h3>{project.name}</h3><time>{project.year}</time></div><p>{project.tagline}</p><p>{project.description}</p><ul>{project.stack.map((item) => <li key={item}>{item}</li>)}</ul><div className="plain-links">{project.liveUrl && <a href={project.liveUrl}>Live site</a>}{project.repoUrl && <a href={project.repoUrl}>Source code</a>}</div></article>)}</div></section>
    <section aria-labelledby="skills"><p className="plain-kicker">TOOLKIT</p><h2 id="skills">Skills</h2><div className="plain-skills">{Object.entries(skills).map(([group, items]) => <article key={group}><h3>{group}</h3><p>{items.join(' · ')}</p></article>)}</div></section>
    <footer>Based in {profile.location} · <a href={`mailto:${profile.email}`}>Get in touch</a></footer>
  </main>;
}
