import { registerRefs } from '../engine/codeRegistry';
import type { CodeRef } from '../engine/codeTypes';
import type React from 'react';
import type { Brand, Challenge, CoursePack, ModulePack } from '../../convex/lib/courseSchema';
import type { BuiltinCourse, CoursePage } from '../engine/course';
import { sanitizeBrand } from '../engine/theme';

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
  base: string;
  id: string;
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
  return pack.modules.map((courseModule) => ({ ...courseModule, status: 'ready' as const, pack: courseModule }));
}

function registerPackRefs(refs: Record<string, unknown> | undefined) {
  if (refs) registerRefs(refs as Record<string, CodeRef>);
}

export function fromBuiltin(course: BuiltinCourse): ShellCourse {
  if (course.format === 'pack') registerPackRefs(course.pack.codeRefs);
  const base = { base: `/c/${course.id}`, id: course.id, title: course.title, tagline: course.tagline, summary: course.summary, kind: course.kind, brand: course.brand, pages: course.pages ?? [] };
  if (course.format === 'react') {
    return { ...base, modules: course.modules.map((courseModule) => ({ id: courseModule.id, n: courseModule.n, title: courseModule.title, kicker: courseModule.kicker, minutes: courseModule.minutes, summary: courseModule.summary, status: 'ready', Component: courseModule.Component })) };
  }
  return { ...base, modules: packModules(course.pack), challenges: course.pack.challenges };
}

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
      .sort((first, second) => first.n - second.n)
      .map((courseModule) => {
        const details = courseModule.pack ?? courseModule.outline ?? {};
        return {
          id: details.id ?? `m${courseModule.n}`,
          n: courseModule.n,
          title: details.title ?? `Module ${courseModule.n}`,
          kicker: details.kicker ?? '',
          minutes: details.minutes ?? 20,
          summary: details.summary ?? '',
          status: courseModule.status,
          pack: courseModule.status === 'ready' ? courseModule.pack : undefined,
        };
      }),
  };
}
