import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Link } from '@farm.js/core/client';
import { usePathname } from '@farm.js/core/navigation';
import type { Brand } from '../../convex/lib/courseSchema';
import { AccountButton, openSignIn } from '../account';
import { builtinCourses } from '../courses';
import { CodeDrawer } from '../engine/CodeDrawer';
import { Toaster } from '../engine/kit';
import { setProgressNamespace } from '../engine/progress';
import { registerSimplifier, type SimplifyResult } from '../engine/simplify';
import { brandVars, DEEPLY_BRAND, isLight, useBrandFonts } from '../engine/theme';
import { trackPageView } from '../lib/analytics';
import { redirectLegacyHashURL } from './legacyRedirect';
import { useConvexClient } from './convexClient';
import { CourseHome, CourseNav, ModulePage, NotFound, PageView } from './CoursePages';
import { ErrorBoundary } from './ErrorBoundary';
import { fromBuiltin, fromGenerated, type GeneratedCourseDoc, type ShellCourse } from './model';

import type { CourseSection, CourseSource } from '../types';

function useReveal(dependency: unknown) {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    elements.forEach((element) => observer.observe(element));
    const mutationObserver = new MutationObserver(() =>
      document.querySelectorAll('.reveal:not(.in)').forEach((element) => observer.observe(element))
    );
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [dependency]);
}

function Wordmark() {
  return (
    <Link href="/" className="brand" aria-label="Deeply home">
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 9h6a7 7 0 0 1 0 14H9z" fill="var(--accent)" />
      </svg>
      <span>Deeply</span>
    </Link>
  );
}

function Themed({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  useBrandFonts(brand);
  const style = useMemo(
    () => ({ ...brandVars(brand), colorScheme: isLight(brand.colors.bg) ? 'light' : 'dark' }) as React.CSSProperties,
    [brand]
  );
  useEffect(() => {
    document.body.style.background = brand.colors.bg;
    document.documentElement.style.colorScheme = isLight(brand.colors.bg) ? 'light' : 'dark';
  }, [brand]);
  return (
    <div className="themed" style={style}>
      {children}
    </div>
  );
}

function Shell({ brand, nav, children }: { brand: Brand; nav: React.ReactNode; children: React.ReactNode }) {
  const route = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [route]);
  return (
    <Themed brand={brand}>
      <div className="shell">
        <button
          className="nav-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          ☰
        </button>
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <Wordmark />
          {nav}
          <div className="side-foot">
            <AccountButton />
            <span className="side-legal">
              Open source. Course content about third-party projects is unofficial.{' '}
              <a href="https://github.com/Benonii/deeply" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </span>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
      <CodeDrawer />
      <Toaster />
    </Themed>
  );
}

function PlatformNav() {
  const route = usePathname();
  const item = (href: string, label: string, icon: string, on: boolean) => (
    <Link key={href} href={href} className={`nav-item ${on ? 'on' : ''}`}>
      <span className="nav-n">{icon}</span>
      <span className="nav-t">{label}</span>
    </Link>
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

function CourseRoutes({ course, section }: { course: ShellCourse; section?: CourseSection }) {
  const route = usePathname();
  setProgressNamespace(course.id);
  let body: React.ReactNode;
  if (!section) body = <CourseHome course={course} />;
  else if (section.kind === 'm') body = <ModulePage course={course} moduleId={section.id} />;
  else body = <PageView course={course} pageId={section.id} />;
  return (
    <Shell
      brand={course.brand}
      nav={
        <>
          <CourseNav course={course} route={route} />
          <nav aria-label="Deeply">
            <div className="nav-label">Deeply</div>
            <Link href="/" className="nav-item">
              <span className="nav-n">◇</span>
              <span className="nav-t">All courses</span>
            </Link>
            <Link href="/create" className="nav-item">
              <span className="nav-n">+</span>
              <span className="nav-t">Create a course</span>
            </Link>
          </nav>
        </>
      }
    >
      {body}
    </Shell>
  );
}

function PlatformMessage({ title, lede }: { title: string; lede: string }) {
  return (
    <PlatformScreen>
      <div className="page-head">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </div>
    </PlatformScreen>
  );
}

function GeneratedCourse({ slug, section }: { slug: string; section?: CourseSection }) {
  const doc = useQuery(anyApi.courses.getBySlug, { slug }) as GeneratedCourseDoc | null | undefined;
  if (doc === undefined)
    return (
      <PlatformScreen>
        <div className="page-head">
          <span className="spinner" /> <p className="lede">Loading course…</p>
        </div>
      </PlatformScreen>
    );
  if (doc === null)
    return (
      <PlatformScreen>
        <NotFound what="course" back="/" />
      </PlatformScreen>
    );
  const course = fromGenerated(doc, DEEPLY_BRAND);
  if (doc.course.status === 'failed' && !course.modules.some((courseModule) => courseModule.status === 'ready')) {
    return (
      <PlatformScreen>
        <div className="page-head">
          <div className="eyebrow">Generation failed</div>
          <h1>{course.title}</h1>
          <p className="lede">{doc.course.error ?? 'Something went wrong while writing this course.'}</p>
        </div>
      </PlatformScreen>
    );
  }
  return <CourseRoutes course={course} section={section} />;
}

function GeneratedCourseScreen({ slug, section }: { slug: string; section?: CourseSection }) {
  const client = useConvexClient();
  const route = usePathname();
  if (!client)
    return (
      <PlatformMessage
        title="Community courses need the Deeply backend."
        lede="This copy of the app isn't connected to one."
      />
    );
  return (
    <ErrorBoundary
      resetKey={route}
      fallback={
        <PlatformMessage
          title="Couldn't load this course."
          lede="The course service isn't available right now. Try again in a minute."
        />
      }
    >
      <GeneratedCourse slug={slug} section={section} />
    </ErrorBoundary>
  );
}

function BuiltinCourseScreen({ courseID, section }: { courseID: string; section?: CourseSection }) {
  const course = builtinCourses.find((candidate) => candidate.id === courseID);
  if (!course) return <NotFoundScreen />;
  return <CourseRoutes course={fromBuiltin(course)} section={section} />;
}

export function PlatformScreen({ children }: { children: React.ReactNode }) {
  return (
    <Shell brand={DEEPLY_BRAND} nav={<PlatformNav />}>
      {children}
    </Shell>
  );
}

export function NotFoundScreen() {
  return (
    <PlatformScreen>
      <NotFound what="page" back="/" />
    </PlatformScreen>
  );
}

export function CourseScreen({
  source,
  courseID,
  section
}: {
  source: CourseSource;
  courseID: string;
  section?: CourseSection;
}) {
  if (source === 'g') return <GeneratedCourseScreen slug={courseID} section={section} />;
  return <BuiltinCourseScreen courseID={courseID} section={section} />;
}

export function AppEffects() {
  const route = usePathname();
  const client = useConvexClient();
  useReveal(route);
  useEffect(() => redirectLegacyHashURL(), []);
  useEffect(() => trackPageView(route), [route]);
  useEffect(() => {
    registerSimplifier(
      client ? (args) => client.action(anyApi.simplify.simplify, args) as Promise<SimplifyResult> : null,
      { onAuth: () => openSignIn('Sign in to simplify explanations.') }
    );
  }, [client]);
  return null;
}
