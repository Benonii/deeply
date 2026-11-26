import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@farm.js/core/client';
import { usePathname } from '@farm.js/core/navigation';
import type { Brand } from '../../convex/lib/courseSchema';
import { AccountButton } from '../account';
import { builtinCourseLinks } from '../courses/catalog';
import { CodeDrawer } from '../engine/CodeDrawer';
import { Toaster } from '../engine/kit';
import { brandVars, DEEPLY_BRAND, isLight, useBrandFonts } from '../engine/theme';
import { NotFound } from './NotFound';

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

export function Shell({ brand, nav, children }: { brand: Brand; nav: React.ReactNode; children: React.ReactNode }) {
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
      {item('/', 'Chat', '◈', route === '/')}
      {item('/courses', 'All courses', '◇', route.startsWith('/courses'))}
      {item('/create', 'Create a course', '+', route.startsWith('/create'))}
      {item('/account', 'Account & credits', '◎', route.startsWith('/account'))}
      <div className="nav-label">Courses</div>
      {builtinCourseLinks.map((builtinCourse) => item(`/c/${builtinCourse.id}`, builtinCourse.title, '▸', false))}
    </nav>
  );
}

export function PlatformScreen({ children }: { children: React.ReactNode }) {
  return (
    <Shell brand={DEEPLY_BRAND} nav={<PlatformNav />}>
      {children}
    </Shell>
  );
}

export function PlatformMessage({ title, lede }: { title: string; lede: string }) {
  return (
    <PlatformScreen>
      <div className="page-head">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </div>
    </PlatformScreen>
  );
}

export function NotFoundScreen() {
  return (
    <PlatformScreen>
      <NotFound what="page" back="/" />
    </PlatformScreen>
  );
}
