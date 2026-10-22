import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import type { Brand } from '../../convex/lib/courseSchema';
import { AccountButton, AccountPage, openSignIn } from '../account';
import { builtinCourses } from '../courses';
import { CreatePage } from '../create';
import { CodeDrawer } from '../engine/CodeDrawer';
import { Toaster } from '../engine/kit';
import { setProgressNamespace } from '../engine/progress';
import { registerSimplifier, type SimplifyResult } from '../engine/simplify';
import { brandVars, DEEPLY_BRAND, isLight, useBrandFonts } from '../engine/theme';
import { useConvexClient } from './convexClient';
import { CourseHome, CourseNav, ModulePage, NotFound, PageView } from './CoursePages';
import { ErrorBoundary } from './ErrorBoundary';
import { PlatformHome } from './Home';
import { fromBuiltin, fromGenerated, type GeneratedCourseDoc, type ShellCourse } from './model';

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

/** Links from the single-course Convex app keep working. */
function legacyRedirect(path: string): string | null {
  const match = path.match(/^\/(m\/[\w-]+|playground|lab|source)$/);
  if (!match) return null;
  return match[1].startsWith('m/') ? `/c/convex/${match[1]}` : `/c/convex/p/${match[1]}`;
}

function useRoute() {
  const read = () => {
    const path = (location.hash || '#/').slice(1) || '/';
    const legacy = legacyRedirect(path);
    if (legacy) { history.replaceState(null, '', `#${legacy}`); return legacy; }
    return path;
  };
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => { setPath(read()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

type Route =
  | { page: 'home' }
  | { page: 'create' }
  | { page: 'account' }
  | { page: 'course'; source: 'c' | 'g'; id: string; sub?: { kind: 'm' | 'p'; id: string } }
  | { page: 'notfound' };

function parse(path: string): Route {
  if (path === '/' || path === '') return { page: 'home' };
  if (path.startsWith('/create')) return { page: 'create' };
  if (path.startsWith('/account')) return { page: 'account' };
  const match = path.match(/^\/(c|g)\/([\w-]+)(?:\/(m|p)\/([\w-]+))?\/?$/);
  if (match) return { page: 'course', source: match[1] as 'c' | 'g', id: match[2], sub: match[3] ? { kind: match[3] as 'm' | 'p', id: match[4] } : undefined };
  return { page: 'notfound' };
}

function useReveal(dependency: unknown) {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { elements.forEach((element) => element.classList.add('in')); return; }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    elements.forEach((element) => observer.observe(element));
    // Content that loads later (generated modules) gets revealed too.
    const mutationObserver = new MutationObserver(() => document.querySelectorAll('.reveal:not(.in)').forEach((element) => observer.observe(element)));
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutationObserver.disconnect(); };
  }, [dependency]);
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function Wordmark() {
  return (
    <a href="#/" className="brand" aria-label="Deeply home">
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 9h6a7 7 0 0 1 0 14H9z" fill="var(--accent)" />
      </svg>
      <span>Deeply</span>
    </a>
  );
}

function Themed({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  useBrandFonts(brand);
  const style = useMemo(() => ({ ...brandVars(brand), colorScheme: isLight(brand.colors.bg) ? 'light' : 'dark' }) as React.CSSProperties, [brand]);
  useEffect(() => {
    // Body paints behind the shell (overscroll, drawers), so it follows the course background.
    document.body.style.background = brand.colors.bg;
    document.documentElement.style.colorScheme = isLight(brand.colors.bg) ? 'light' : 'dark';
  }, [brand]);
  return <div className="themed" style={style}>{children}</div>;
}

function Shell({ brand, nav, children, route }: { brand: Brand; nav: React.ReactNode; children: React.ReactNode; route: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [route]);
  return (
    <Themed brand={brand}>
      <div className="shell">
        <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>☰</button>
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <Wordmark />
          {nav}
          <div className="side-foot">
            <AccountButton />
            <span className="side-legal">Open source. Course content about third-party projects is unofficial. <a href="https://github.com/Benonii/deeply" target="_blank" rel="noreferrer">GitHub</a></span>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
      <CodeDrawer />
      <Toaster />
    </Themed>
  );
}

function PlatformNav({ route }: { route: string }) {
  const item = (href: string, label: string, icon: string, on: boolean) => (
    <a href={`#${href}`} className={`nav-item ${on ? 'on' : ''}`}><span className="nav-n">{icon}</span><span className="nav-t">{label}</span></a>
  );
  return (
    <nav aria-label="Deeply">
      <div className="nav-label">Explore</div>
      {item('/', 'All courses', '◇', route === '/')}
      {item('/create', 'Create a course', '+', route.startsWith('/create'))}
      {item('/account', 'Account & credits', '◎', route.startsWith('/account'))}
      <div className="nav-label">Courses</div>
      {builtinCourses.map((builtinCourse) => item(`/c/${builtinCourse.id}`, builtinCourse.title, '▸', false))}
    </nav>
  );
}

function CourseRoutes({ course, route, sub }: { course: ShellCourse; route: string; sub?: { kind: 'm' | 'p'; id: string } }) {
  setProgressNamespace(course.id);
  let body: React.ReactNode;
  if (!sub) body = <CourseHome course={course} />;
  else if (sub.kind === 'm') body = <ModulePage course={course} moduleId={sub.id} />;
  else body = <PageView course={course} pageId={sub.id} />;
  return (
    <Shell brand={course.brand} route={route} nav={<><CourseNav course={course} route={route} /><nav aria-label="Deeply"><div className="nav-label">Deeply</div><a href="#/" className="nav-item"><span className="nav-n">◇</span><span className="nav-t">All courses</span></a><a href="#/create" className="nav-item"><span className="nav-n">+</span><span className="nav-t">Create a course</span></a></nav></>}>
      {body}
    </Shell>
  );
}

function GeneratedCourse({ slug, route, sub }: { slug: string; route: string; sub?: { kind: 'm' | 'p'; id: string } }) {
  const doc = useQuery(anyApi.courses.getBySlug, { slug }) as GeneratedCourseDoc | null | undefined;
  if (doc === undefined) return <Shell brand={DEEPLY_BRAND} route={route} nav={<PlatformNav route={route} />}><div className="page-head"><span className="spinner" /> <p className="lede">Loading course…</p></div></Shell>;
  if (doc === null) return <Shell brand={DEEPLY_BRAND} route={route} nav={<PlatformNav route={route} />}><NotFound what="course" back="#/" /></Shell>;
  const course = fromGenerated(doc, DEEPLY_BRAND);
  if (doc.course.status === 'failed' && !course.modules.some((courseModule) => courseModule.status === 'ready')) {
    return (
      <Shell brand={DEEPLY_BRAND} route={route} nav={<PlatformNav route={route} />}>
        <div className="page-head"><div className="eyebrow">Generation failed</div><h1>{course.title}</h1><p className="lede">{doc.course.error ?? 'Something went wrong while writing this course.'}</p></div>
      </Shell>
    );
  }
  return <CourseRoutes course={course} route={route} sub={sub} />;
}

/* ------------------------------------------------------------------ */

export function App() {
  const path = useRoute();
  const route = parse(path);
  const client = useConvexClient();
  useReveal(path);

  // Simplify goes through the backend when one is connected.
  useEffect(() => {
    registerSimplifier(
      client ? (args) => client.action(anyApi.simplify.simplify, args) as Promise<SimplifyResult> : null,
      { onAuth: () => openSignIn('Sign in to simplify explanations.') },
    );
  }, [client]);

  if (route.page === 'course' && route.source === 'c') {
    const course = builtinCourses.find((candidate) => candidate.id === route.id);
    if (course) return <CourseRoutes course={fromBuiltin(course)} route={path} sub={route.sub} />;
  }
  if (route.page === 'course' && route.source === 'g') {
    if (!client) {
      return <Shell brand={DEEPLY_BRAND} route={path} nav={<PlatformNav route={path} />}><div className="page-head"><h1>Community courses need the Deeply backend.</h1><p className="lede">This copy of the app isn't connected to one.</p></div></Shell>;
    }
    return (
      <ErrorBoundary resetKey={path} fallback={<Shell brand={DEEPLY_BRAND} route={path} nav={<PlatformNav route={path} />}><div className="page-head"><h1>Couldn't load this course.</h1><p className="lede">The course service isn't available right now. Try again in a minute.</p></div></Shell>}>
        <GeneratedCourse slug={route.id} route={path} sub={route.sub} />
      </ErrorBoundary>
    );
  }
  let page: React.ReactNode;
  if (route.page === 'home') page = <PlatformHome />;
  else if (route.page === 'create') page = <CreatePage />;
  else if (route.page === 'account') page = <AccountPage />;
  else page = <NotFound what="page" back="#/" />;
  return <Shell brand={DEEPLY_BRAND} route={path} nav={<PlatformNav route={path} />}>{page}</Shell>;
}
