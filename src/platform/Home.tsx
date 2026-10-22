import React from 'react';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import type { Brand } from '../../convex/lib/courseSchema';
import { builtinCourses } from '../courses';
import { useProgress } from '../engine/progress';
import { DEEPLY_BRAND, sanitizeBrand, useBrandFonts } from '../engine/theme';
import { BrandShader } from './BrandShader';
import { useConvexClient } from './convexClient';
import { ErrorBoundary } from './ErrorBoundary';
import { fromBuiltin } from './model';
import type { PublicCourseListing } from '../types';

type CardData = { href: string; title: string; tagline: string; brand: Brand; kind: 'concept' | 'repo'; modules: number; minutes?: number; done?: number; logo?: string; community?: boolean };

function Swatches({ brand: b }: { brand: Brand }) {
  return (
    <span className="cc-swatches" aria-hidden>
      {[b.colors.accent, b.colors.accent2, b.colors.accent3].map((color, index) => <span key={index} style={{ background: color }} />)}
    </span>
  );
}

function CourseCard({ card: c }: { card: CardData }) {
  useBrandFonts(c.brand);
  const [head, ...rest] = c.title.split(', ');
  return (
    <a className="cc reveal" href={c.href} style={{ '--cc-accent': c.brand.colors.accent } as React.CSSProperties}>
      <div className="cc-top">
        {c.logo ? <span className="cc-logo" dangerouslySetInnerHTML={{ __html: c.logo }} /> : <Swatches brand={c.brand} />}
        <span className="cc-kind">{c.community ? 'Community · ' : ''}{c.kind === 'repo' ? 'Codebase' : 'Concept'}</span>
      </div>
      <div className="cc-title" style={{ fontFamily: `'${c.brand.fonts.display}', var(--font-display)` }}>
        {head}{rest.length > 0 && <>, <span style={{ color: c.brand.colors.accent }}>{rest.join(', ')}</span></>}
      </div>
      <p className="cc-tag">{c.tagline}</p>
      <div className="cc-foot">
        <span>{c.modules} modules{c.minutes ? ` · ~${Math.round((c.minutes / 60) * 10) / 10} h` : ''}</span>
        {c.done !== undefined && c.done > 0 && <span>{c.done}/{c.modules} done</span>}
        <span className="cc-go">→</span>
      </div>
    </a>
  );
}

function CommunityCourses() {
  const list = useQuery(anyApi.courses.listPublic, {}) as PublicCourseListing[] | undefined;
  if (list === undefined) return <p className="muted small">Loading community courses…</p>;
  if (!list.length) return <p className="muted">No community courses yet. <a href="#/create">Create the first one.</a></p>;
  return (
    <div className="cc-grid">
      {list.map((publicCourse) => (
        <CourseCard
          key={publicCourse.slug}
          card={{
            href: `#/g/${publicCourse.slug}`,
            title: publicCourse.title,
            tagline: publicCourse.tagline,
            brand: sanitizeBrand(publicCourse.brand),
            kind: publicCourse.kind,
            modules: publicCourse.moduleCount,
            community: true,
          }}
        />
      ))}
    </div>
  );
}

export function PlatformHome() {
  const { all } = useProgress();
  const client = useConvexClient();
  const cards: CardData[] = builtinCourses.map((builtinCourse) => {
    const course = fromBuiltin(builtinCourse);
    return {
      href: `#${course.base}`,
      title: course.title,
      tagline: course.tagline,
      brand: course.brand,
      kind: course.kind,
      modules: course.modules.length,
      minutes: course.modules.reduce((sum, courseModule) => sum + courseModule.minutes, 0),
      done: course.modules.filter((courseModule) => all.done[`${course.id}:${courseModule.id}`]).length,
      logo: builtinCourse.brand.logoSvg,
    };
  });
  return (
    <div className="home platform-home">
      <section className="hero hero-platform">
        <div className="hero-shader" aria-hidden><BrandShader brand={DEEPLY_BRAND} role="hero" /></div>
        <div className="hero-inner">
          <div className="eyebrow">Open-source deep dives</div>
          <h1>Learn anything, <span className="hl">deeply.</span></h1>
          <p className="lede">
            Courses that open up how things really work: animated diagrams of every moving part, the real source code
            behind them, challenges that test you, and a Simplify button for whenever the explanation gets too dense.
          </p>
          <div className="hero-cta">
            <a className="btn primary" href="#/create">Create a course →</a>
            <a className="btn ghost" href="#catalog" onClick={(event) => { event.preventDefault(); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }}>Browse courses</a>
          </div>
        </div>
      </section>

      <section className="platform-section" id="catalog">
        <div className="ps-head"><h2>Courses</h2><p className="muted">Written and checked by hand.</p></div>
        <div className="cc-grid">{cards.map((card) => <CourseCard key={card.href} card={card} />)}</div>
      </section>

      {client && (
        <section className="platform-section">
          <div className="ps-head"><h2>From the community</h2><p className="muted">Generated on Deeply from a topic or a GitHub repo.</p></div>
          <ErrorBoundary fallback={<p className="muted">Community courses aren't available right now.</p>}>
            <CommunityCourses />
          </ErrorBoundary>
        </section>
      )}

      <section className="platform-section how">
        <div className="ps-head"><h2>How a course gets made</h2></div>
        <ol className="how-steps">
          <li><b>Name a topic or a repo.</b><span>A concept like CRDTs, or a GitHub repository. Brand colors and type come from the project's own guidelines when it has them.</span></li>
          <li><b>It's researched and written module by module.</b><span>Each module gets diagrams you can step through, deep dives, and quick checks. For repos, code excerpts are checked against the real files.</span></li>
          <li><b>You learn it, at your level.</b><span>Simplify any block when it gets too dense, copy any block as a prompt, and prove it in the challenges.</span></li>
        </ol>
      </section>
    </div>
  );
}
