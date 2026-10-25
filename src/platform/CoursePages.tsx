import { Link } from '@farm.js/core/client';
import { buildPrompt, CopyBtn, ModuleCtx } from '../engine/kit';
import { PackChallenges } from '../engine/PackChallenges';
import { PackModule } from '../engine/PackModule';
import { useProgress } from '../engine/progress';
import { BrandShader } from './BrandShader';
import type { ShellCourse, ShellModule } from './model';

const padTwoDigits = (digits: number) => String(digits).padStart(2, '0');

export function coursePages(course: ShellCourse) {
  const pages = [...course.pages];
  if (course.challenges?.length)
    pages.push({
      id: 'challenges',
      label: 'Challenges',
      Component: () => <PackChallenges challenges={course.challenges!} course={course.title} />
    });
  return pages;
}

export function CourseNav({ course, route }: { course: ShellCourse; route: string }) {
  const { progress } = useProgress(course.id);
  const done = course.modules.filter((courseModule) => progress.done[courseModule.id]).length;
  const pages = coursePages(course);
  return (
    <>
      <Link href={course.base} className="side-course">
        <span className="side-course-kicker">Course</span>
        <span className="side-course-title">{course.title}</span>
      </Link>
      <div className="side-progress">
        <div className="bar">
          <span style={{ width: `${(done / Math.max(1, course.modules.length)) * 100}%` }} />
        </div>
        <span>
          {done}/{course.modules.length} modules
        </span>
      </div>
      <nav aria-label={`${course.title} modules`}>
        <div className="nav-label">Modules</div>
        {course.modules.map((courseModule) => {
          const href = `${course.base}/m/${courseModule.id}`;
          const ready = courseModule.status === 'ready';
          return (
            <Link
              key={courseModule.id}
              href={href}
              className={`nav-item ${route === href ? 'on' : ''} ${progress.done[courseModule.id] ? 'done' : ''} ${ready ? '' : 'pending'}`}
              aria-disabled={!ready}
            >
              <span className="nav-n">{padTwoDigits(courseModule.n)}</span>
              <span className="nav-t">{courseModule.title}</span>
              <span className="nav-min">
                {ready ? `${courseModule.minutes}m` : courseModule.status === 'failed' ? 'failed' : 'writing'}
              </span>
            </Link>
          );
        })}
        {pages.length > 0 && <div className="nav-label">Practice</div>}
        {pages.map((page) => {
          const href = `${course.base}/p/${page.id}`;
          return (
            <Link key={page.id} href={href} className={`nav-item ${route.startsWith(href) ? 'on' : ''}`}>
              <span className="nav-n">▸</span>
              <span className="nav-t">{page.label}</span>
              {page.badge && <span className="nav-min">{page.badge}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function CourseHome({ course }: { course: ShellCourse }) {
  const { progress } = useProgress(course.id);
  const ready = course.modules.filter((courseModule) => courseModule.status === 'ready');
  const total = course.modules.reduce((sum, courseModule) => sum + courseModule.minutes, 0);
  const next = ready.find((courseModule) => !progress.done[courseModule.id]) ?? ready[0];
  const pages = coursePages(course);
  const [head, ...rest] = course.title.split(', ');
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-shader" aria-hidden>
          <BrandShader brand={course.brand} role="hero" />
        </div>
        <div className="hero-inner">
          <div className="eyebrow">
            {course.kind === 'repo' ? 'A deep technical course' : 'A deep concept course'} · ~
            {Math.round((total / 60) * 10) / 10} hours
          </div>
          <h1>
            {rest.length ? (
              <>
                {head}, <span className="hl">{rest.join(', ')}</span>
              </>
            ) : (
              course.title
            )}
          </h1>
          {course.tagline && <p className="hero-tag">{course.tagline}</p>}
          {course.summary && <p className="lede">{course.summary}</p>}
          <div className="hero-cta">
            {next && (
              <Link className="btn primary" href={`${course.base}/m/${next.id}`}>
                {Object.keys(progress.done).length ? 'Continue' : 'Start'}: {next.title} →
              </Link>
            )}
            {pages[0] && (
              <Link className="btn ghost" href={`${course.base}/p/${pages[0].id}`}>
                {pages[0].label}
              </Link>
            )}
          </div>
          {course.generating && (
            <p className="gen-note">
              <span className="live-dot" /> This course is still being written. Modules appear here as they finish.
            </p>
          )}
        </div>
      </section>

      <section className="howto reveal">
        <div>
          <h3>How to use this</h3>
          <p>
            Read the modules in order: each builds on the last. Step through every interactive diagram and answer the
            quick checks before reading on. Finish with the challenges.
          </p>
        </div>
        <div>
          <h3>Stuck? Simplify, or ask.</h3>
          <p>
            Every block has a <b>Simplify</b> button that rewrites it in plainer words, and a <b>Copy</b> button that
            turns it into a prompt you can paste to Claude.
          </p>
          <CopyBtn
            label="Copy the course outline"
            get={() =>
              buildPrompt(
                [course.title, 'Course outline'],
                course.modules
                  .map(
                    (courseModule) =>
                      `${courseModule.n}. ${courseModule.title} (${courseModule.minutes} min): ${courseModule.summary}`
                  )
                  .join('\n')
              )
            }
          />
        </div>
      </section>

      <section className="curriculum">
        {course.modules.map((courseModule, index) => {
          const ok = courseModule.status === 'ready';
          const Tag = ok ? 'a' : 'div';
          return (
            <Tag
              key={courseModule.id}
              {...(ok ? { href: `${course.base}/m/${courseModule.id}` } : {})}
              className={`mod-card reveal ${progress.done[courseModule.id] ? 'done' : ''} ${ok ? '' : 'pending'}`}
              style={{ transitionDelay: `${index * 40}ms` }}
            >
              <div className="mod-n">{padTwoDigits(courseModule.n)}</div>
              <div className="mod-body">
                <div className="mod-kicker">
                  {courseModule.kicker}
                  {courseModule.kicker ? ' · ' : ''}
                  {ok
                    ? `${courseModule.minutes} min`
                    : courseModule.status === 'failed'
                      ? 'failed to generate'
                      : 'being written…'}
                </div>
                <div className="mod-title">{courseModule.title}</div>
                <p>{courseModule.summary}</p>
              </div>
              <div className="mod-state">
                {progress.done[courseModule.id] ? (
                  '✓'
                ) : ok ? (
                  '→'
                ) : courseModule.status === 'failed' ? (
                  '!'
                ) : (
                  <span className="spinner" aria-label="Writing" />
                )}
              </div>
            </Tag>
          );
        })}
        {pages.map((page) => (
          <Link key={page.id} href={`${course.base}/p/${page.id}`} className="mod-card reveal">
            <div className="mod-n">▸</div>
            <div className="mod-body">
              <div className="mod-kicker">Practice</div>
              <div className="mod-title">{page.label}</div>
            </div>
            <div className="mod-state">→</div>
          </Link>
        ))}
      </section>
    </div>
  );
}

function ModuleBody({ courseModule: m }: { courseModule: ShellModule }) {
  if (m.Component) return <m.Component />;
  if (m.pack) return <PackModule pack={m.pack} />;
  return (
    <div className="module-pending">
      {m.status === 'failed' ? (
        <p>This module failed to generate.</p>
      ) : (
        <>
          <span className="spinner" /> <p>This module is still being written. It will appear here automatically.</p>
        </>
      )}
    </div>
  );
}

export function ModulePage({ course, moduleId }: { course: ShellCourse; moduleId: string }) {
  const index = course.modules.findIndex((courseModule) => courseModule.id === moduleId);
  const { progress, markModule } = useProgress(course.id);
  if (index < 0) return <NotFound what="module" back={`#${course.base}`} />;
  const courseModule = course.modules[index];
  const next = course.modules.slice(index + 1).find((courseModule) => courseModule.status === 'ready');
  const pages = coursePages(course);
  return (
    <ModuleCtx.Provider value={{ title: `Module ${courseModule.n}: ${courseModule.title}`, course: course.title }}>
      <article className="module">
        <header className="module-head">
          <div className="module-shader" aria-hidden>
            <BrandShader brand={course.brand} role="band" seed={index} />
          </div>
          <div className="module-head-inner">
            <div className="eyebrow">
              Module {padTwoDigits(courseModule.n)}
              {courseModule.kicker ? ` · ${courseModule.kicker}` : ''} · {courseModule.minutes} min
            </div>
            <h1>{courseModule.title}</h1>
            <p className="lede">{courseModule.summary}</p>
          </div>
        </header>
        <div className="module-body" key={courseModule.id}>
          <ModuleBody courseModule={courseModule} />
        </div>
        <footer className="module-foot">
          <div className="module-foot-shader" aria-hidden>
            <BrandShader brand={course.brand} role="foot" />
          </div>
          <div className="module-foot-inner">
            <button
              className={`btn ${progress.done[courseModule.id] ? 'ghost' : 'primary'}`}
              onClick={() => markModule(courseModule.id, !progress.done[courseModule.id])}
            >
              {progress.done[courseModule.id] ? '✓ Completed' : 'Mark module complete'}
            </button>
            {next ? (
              <Link
                className="btn ghost"
                href={`${course.base}/m/${next.id}`}
                onClick={() => markModule(courseModule.id, true)}
              >
                Next: {next.title} →
              </Link>
            ) : pages[0] ? (
              <Link
                className="btn ghost"
                href={`${course.base}/p/${pages[0].id}`}
                onClick={() => markModule(courseModule.id, true)}
              >
                Go to {pages[0].label.toLowerCase()} →
              </Link>
            ) : null}
          </div>
        </footer>
      </article>
    </ModuleCtx.Provider>
  );
}

export function PageView({ course, pageId }: { course: ShellCourse; pageId: string }) {
  const page = coursePages(course).find((candidate) => candidate.id === pageId);
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
      <p className="lede">
        <Link href={back}>Go back</Link>
      </p>
    </div>
  );
}
