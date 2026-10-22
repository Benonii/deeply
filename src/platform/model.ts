import { registerRefs } from '../engine/codeRegistry';
import type { CodeRef } from '../engine/codeTypes';
import type React from 'react';
import type { Brand, Challenge, CoursePack, ModulePack } from '../../convex/lib/courseSchema';
import type { BuiltinCourse, CoursePage } from '../engine/course';
import { sanitizeBrand } from '../engine/theme';

/** What the shell renders, whatever the course's source (React modules, a JSON pack, or a generated course). */
export type ShellModule = {
  id: string;
  n: number;
  title: string;
  kicker: string;
  minutes: number;
  summary: string;
  status: 'ready' | 'pending' | 'writing' | 'failed';
  Component?: React.FC;
  pack?: ModulePack;
};

export type ShellCourse = {
  base: string; // hash prefix: "/c/convex" or "/g/<slug>"
  id: string; // progress namespace
  title: string;
  tagline: string;
  summary: string;
  kind: 'concept' | 'repo';
  brand: Brand;
  modules: ShellModule[];
  pages: CoursePage[];
  challenges?: Challenge[];
  generating?: boolean;
};

function packModules(pack: CoursePack): ShellModule[] {
  return pack.modules.map((m) => ({ ...m, status: 'ready' as const, pack: m }));
}

/** Make a pack's verified source excerpts openable from its diagrams. */
function registerPackRefs(refs: Record<string, unknown> | undefined) {
  if (refs) registerRefs(refs as Record<string, CodeRef>);
}

export function fromBuiltin(c: BuiltinCourse): ShellCourse {
  if (c.format === 'pack') registerPackRefs(c.pack.codeRefs);
  const base = { base: `/c/${c.id}`, id: c.id, title: c.title, tagline: c.tagline, summary: c.summary, kind: c.kind, brand: c.brand, pages: c.pages ?? [] };
  if (c.format === 'react') {
    return { ...base, modules: c.modules.map((m) => ({ id: m.id, n: m.n, title: m.title, kicker: m.kicker, minutes: m.minutes, summary: m.summary, status: 'ready', Component: m.Component })) };
  }
  return { ...base, modules: packModules(c.pack), challenges: c.pack.challenges };
}

/** Shape returned by `courses.getBySlug` (generator workstream). */
export type GeneratedCourseDoc = {
  course: { slug: string; status: string; topic: string; kind: 'concept' | 'repo'; meta?: any; error?: string };
  modules: { n: number; status: ShellModule['status']; outline: any; pack?: ModulePack; error?: string }[];
};

export function fromGenerated(doc: GeneratedCourseDoc, fallbackBrand: Brand): ShellCourse {
  registerPackRefs((doc.course.meta as { codeRefs?: Record<string, unknown> } | undefined)?.codeRefs);
  const meta = doc.course.meta ?? {};
  return {
    base: `/g/${doc.course.slug}`,
    id: `g-${doc.course.slug}`,
    title: meta.title ?? doc.course.topic,
    tagline: meta.tagline ?? '',
    summary: meta.summary ?? '',
    kind: doc.course.kind,
    brand: sanitizeBrand(meta.brand, fallbackBrand),
    challenges: meta.challenges,
    pages: [],
    generating: doc.course.status !== 'ready' && doc.course.status !== 'failed',
    modules: [...doc.modules]
      .sort((a, b) => a.n - b.n)
      .map((m) => {
        const o = m.pack ?? m.outline ?? {};
        return {
          id: o.id ?? `m${m.n}`,
          n: m.n,
          title: o.title ?? `Module ${m.n}`,
          kicker: o.kicker ?? '',
          minutes: o.minutes ?? 20,
          summary: o.summary ?? '',
          status: m.status,
          pack: m.status === 'ready' ? m.pack : undefined,
        };
      }),
  };
}
