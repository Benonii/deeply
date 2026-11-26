import { ConceptMap } from '../lib/conceptMapSchema';
import { ModulePack } from '../lib/courseSchema';
import { pythonGeneratorsCourse } from '../lib/fixtures/pythonGenerators';

import type { QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import type { GlossaryTerm } from '../lib/courseSchema';
import type { CourseSource, ResolvedExplainBack } from './types';

const GENERATED_PREFIX = 'g-';

const BUILTIN_SOURCES: Record<string, CourseSource> = {
  [pythonGeneratorsCourse.pack.id]: {
    title: pythonGeneratorsCourse.pack.title,
    tagline: pythonGeneratorsCourse.pack.tagline,
    summary: pythonGeneratorsCourse.pack.summary,
    map: pythonGeneratorsCourse.map,
    modules: pythonGeneratorsCourse.pack.modules
  }
};

function readMetaText(meta: unknown, key: 'title' | 'tagline' | 'summary'): string {
  if (typeof meta !== 'object' || meta === null) return '';
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

async function readStoredMap(context: QueryCtx, courseId: Id<'courses'>): Promise<ConceptMap | null> {
  const request = await context.db
    .query('courseRequests')
    .withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId))
    .first();
  if (!request) return null;
  const build = await context.db
    .query('courseBuilds')
    .withIndex('by_request', (indexRange) => indexRange.eq('requestId', request._id))
    .unique();
  const parsed = ConceptMap.safeParse(build?.map);
  return parsed.success ? parsed.data : null;
}

async function readGeneratedSource(context: QueryCtx, slug: string): Promise<CourseSource | null> {
  const course = await context.db
    .query('courses')
    .withIndex('by_slug', (indexRange) => indexRange.eq('slug', slug))
    .unique();
  if (!course) return null;
  const rows = await context.db
    .query('courseModules')
    .withIndex('by_course', (indexRange) => indexRange.eq('courseId', course._id))
    .collect();
  const modules = rows
    .sort((left, right) => left.n - right.n)
    .map((row) => ModulePack.safeParse(row.pack))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  const title = readMetaText(course.meta, 'title');
  return {
    title: title.length > 0 ? title : course.topic,
    tagline: readMetaText(course.meta, 'tagline'),
    summary: readMetaText(course.meta, 'summary'),
    map: await readStoredMap(context, course._id),
    modules
  };
}

export async function readCourseSource(context: QueryCtx, courseId: string): Promise<CourseSource | null> {
  if (courseId.startsWith(GENERATED_PREFIX))
    return await readGeneratedSource(context, courseId.slice(GENERATED_PREFIX.length));
  return BUILTIN_SOURCES[courseId] ?? null;
}

export function findModule(source: CourseSource, moduleId: string): ModulePack | null {
  return source.modules.find((pack) => pack.id === moduleId) ?? null;
}

export function listCourseGlossary(source: CourseSource): GlossaryTerm[] {
  const terms = new Map<string, GlossaryTerm>();
  for (const pack of source.modules)
    for (const term of pack.glossary ?? []) if (!terms.has(term.id)) terms.set(term.id, term);
  return [...terms.values()];
}

export function resolveExplainBack(source: CourseSource, subjectId: string): ResolvedExplainBack | null {
  const [kind, path] = subjectId.split(':');
  if (kind !== 'explainback' || !path) return null;
  const [moduleId, sectionId, blockIndex] = path.split('/');
  const pack = findModule(source, moduleId);
  const section = pack?.sections.find((candidate) => candidate.id === sectionId);
  const block = section?.blocks[Number(blockIndex)];
  if (!pack || !block || block.type !== 'explainback') return null;
  return {
    moduleTitle: pack.title,
    conceptId: block.conceptId,
    prompt: block.prompt,
    rubric: block.rubric,
    glossary: pack.glossary ?? []
  };
}
