import React from 'react';
import { buildPrompt, CopyBtn, ModuleCtx } from '../engine/kit';
import { PackChallenges } from '../engine/PackChallenges';
import { PackModule } from '../engine/PackModule';
import { useProgress } from '../engine/progress';
import { BrandShader } from './BrandShader';
import type { ShellCourse, ShellModule } from './model';

const pad = (n: number) => String(n).padStart(2, '0');

/** Extra pages of a course: its own pages plus a challenges page for packs. */
export function coursePages(c: ShellCourse) {
  const pages = [...c.pages];
  if (c.challenges?.length) pages.push({ id: 'challenges', label: 'Challenges', Component: () => <PackChallenges challenges={c.challenges!} course={c.title} /> });
  return pages;
}

export function CourseNav({ course, route }: { course: ShellCourse; route: string }) {
  const { progress } = useProgress(course.id);
  const done = course.modules.filter((m) => progress.done[m.id]).length;
  const pages = coursePages(course);
  return (
    <>
      <a href={`#${course.base}`} className="side-course">
        <span className="side-course-kicker">Course</span>
        <span className="side-course-title">{course.title}</span>
      </a>
      <div className="side-progress">
        <div className="bar"><span style={{ width: `${(done / Math.max(1, course.modules.length)) * 100}%` }} /></div>
        <span>{done}/{course.modules.length} modules</span>
      </div>
      <nav aria-label={`${course.title} modules`}>
        <div className="nav-label">Modules</div>
        {course.modules.map((m) => {
          const href = `${course.base}/m/${m.id}`;
          const ready = m.status === 'ready';
          return (
            <a key={m.id} href={`#${href}`} className={`nav-item ${route === href ? 'on' : ''} ${progress.done[m.id] ? 'done' : ''} ${ready ? '' : 'pending'}`} aria-disabled={!ready}>
              <span className="nav-n">{pad(m.n)}</span>
              <span className="nav-t">{m.title}</span>
              <span className="nav-min">{ready ? `${m.minutes}m` : m.status === 'failed' ? 'failed' : 'writing'}</span>
            </a>
          );
        })}
        {pages.length > 0 && <div className="nav-label">Practice</div>}
        {pages.map((p) => {
          const href = `${course.base}/p/${p.id}`;
          return (
            <a key={p.id} href={`#${href}`} className={`nav-item ${route.startsWith(href) ? 'on' : ''}`}>
              <span className="nav-n">▸</span>
              <span className="nav-t">{p.label}</span>
              {p.badge && <span className="nav-min">{p.badge}</span>}
            </a>
          );
        })}
      </nav>
    </>
  );
}

export function CourseHome({ course }: { course: ShellCourse }) {
  const { progress } = useProgress(course.id);
  const ready = course.modules.filter((m) => m.status === 'ready');
  const total = course.modules.reduce((s, m) => s + m.minutes, 0);
  const next = ready.find((m) => !progress.done[m.id]) ?? ready[0];
  const pages = coursePages(course);
  const [head, ...rest] = course.title.split(', ');
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-shader" aria-hidden><BrandShader brand={course.brand} role="hero" /></div>
        <div className="hero-inner">
          <div className="eyebrow">{course.kind === 'repo' ? 'A deep technical course' : 'A deep concept course'} · ~{Math.round((total / 60) * 10) / 10} hours</div>
          <h1>{rest.length ? <>{head}, <span className="hl">{rest.join(', ')}</span></> : course.title}</h1>
          {course.tagline && <p className="hero-tag">{course.tagline}</p>}
          {course.summary && <p className="lede">{course.summary}</p>}
          <div className="hero-cta">
            {next && <a className="btn primary" href={`#${course.base}/m/${next.id}`}>{Object.keys(progress.done).length ? 'Continue' : 'Start'}: {next.title} →</a>}
            {pages[0] && <a className="btn ghost" href={`#${course.base}/p/${pages[0].id}`}>{pages[0].label}</a>}
          </div>
          {course.generating && <p className="gen-note"><span className="live-dot" /> This course is still being written. Modules appear here as they finish.</p>}
        </div>
      </section>

      <section className="howto reveal">
        <div>
          <h3>How to use this</h3>
          <p>Read the modules in order: each builds on the last. Step through every interactive diagram and answer the quick checks before reading on. Finish with the challenges.</p>
        </div>
        <div>
          <h3>Stuck? Simplify, or ask.</h3>
          <p>Every block has a <b>Simplify</b> button that rewrites it in plainer words, and a <b>Copy</b> button that turns it into a prompt you can paste to Claude.</p>
          <CopyBtn label="Copy the course outline" get={() => buildPrompt([course.title, 'Course outline'], course.modules.map((m) => `${m.n}. ${m.title} (${m.minutes} min): ${m.summary}`).join('\n'))} />
        </div>
      </section>

      <section className="curriculum">
        {course.modules.map((m, k) => {
          const ok = m.status === 'ready';
          const Tag = ok ? 'a' : 'div';
          return (
            <Tag key={m.id} {...(ok ? { href: `#${course.base}/m/${m.id}` } : {})} className={`mod-card reveal ${progress.done[m.id] ? 'done' : ''} ${ok ? '' : 'pending'}`} style={{ transitionDelay: `${k * 40}ms` }}>
              <div className="mod-n">{pad(m.n)}</div>
              <div className="mod-body">
                <div className="mod-kicker">{m.kicker}{m.kicker ? ' · ' : ''}{ok ? `${m.minutes} min` : m.status === 'failed' ? 'failed to generate' : 'being written…'}</div>
                <div className="mod-title">{m.title}</div>
                <p>{m.summary}</p>
              </div>
              <div className="mod-state">{progress.done[m.id] ? '✓' : ok ? '→' : m.status === 'failed' ? '!' : <span className="spinner" aria-label="Writing" />}</div>
            </Tag>
          );
        })}
        {pages.map((p) => (
          <a key={p.id} href={`#${course.base}/p/${p.id}`} className="mod-card reveal">
            <div className="mod-n">▸</div>
            <div className="mod-body">
              <div className="mod-kicker">Practice</div>
              <div className="mod-title">{p.label}</div>
            </div>
            <div className="mod-state">→</div>
          </a>
        ))}
      </section>
    </div>
  );
}

function ModuleBody({ m }: { m: ShellModule }) {
  if (m.Component) return <m.Component />;
  if (m.pack) return <PackModule pack={m.pack} />;
  return (
    <div className="module-pending">
      {m.status === 'failed' ? <p>This module failed to generate.</p> : <><span className="spinner" /> <p>This module is still being written. It will appear here automatically.</p></>}
    </div>
  );
}

export function ModulePage({ course, moduleId }: { course: ShellCourse; moduleId: string }) {
  const idx = course.modules.findIndex((x) => x.id === moduleId);
  const { progress, markModule } = useProgress(course.id);
  if (idx < 0) return <NotFound what="module" back={`#${course.base}`} />;
  const mod = course.modules[idx];
  const next = course.modules.slice(idx + 1).find((m) => m.status === 'ready');
  const pages = coursePages(course);
  return (
    <ModuleCtx.Provider value={{ title: `Module ${mod.n}: ${mod.title}`, course: course.title }}>
      <article className="module">
        <header className="module-head">
          <div className="module-shader" aria-hidden><BrandShader brand={course.brand} role="band" seed={idx} /></div>
          <div className="module-head-inner">
            <div className="eyebrow">Module {pad(mod.n)}{mod.kicker ? ` · ${mod.kicker}` : ''} · {mod.minutes} min</div>
            <h1>{mod.title}</h1>
            <p className="lede">{mod.summary}</p>
          </div>
        </header>
        <div className="module-body" key={mod.id}>
          <ModuleBody m={mod} />
        </div>
        <footer className="module-foot">
          <div className="module-foot-shader" aria-hidden><BrandShader brand={course.brand} role="foot" /></div>
          <div className="module-foot-inner">
            <button className={`btn ${progress.done[mod.id] ? 'ghost' : 'primary'}`} onClick={() => markModule(mod.id, !progress.done[mod.id])}>
              {progress.done[mod.id] ? '✓ Completed' : 'Mark module complete'}
            </button>
            {next ? (
              <a className="btn ghost" href={`#${course.base}/m/${next.id}`} onClick={() => markModule(mod.id, true)}>Next: {next.title} →</a>
            ) : pages[0] ? (
              <a className="btn ghost" href={`#${course.base}/p/${pages[0].id}`} onClick={() => markModule(mod.id, true)}>Go to {pages[0].label.toLowerCase()} →</a>
            ) : null}
          </div>
        </footer>
      </article>
    </ModuleCtx.Provider>
  );
}

export function PageView({ course, pageId }: { course: ShellCourse; pageId: string }) {
  const page = coursePages(course).find((p) => p.id === pageId);
  if (!page) return <NotFound what="page" back={`#${course.base}`} />;
  return (
    <ModuleCtx.Provider value={{ title: page.label, course: course.title }}>
      <page.Component />
    </ModuleCtx.Provider>
  );
}

export function NotFound({ what, back }: { what: string; back: string }) {
  return (
    <div className="page-head">
      <div className="eyebrow">Not found</div>
      <h1>That {what} doesn't exist.</h1>
      <p className="lede"><a href={back}>Go back</a></p>
    </div>
  );
}
