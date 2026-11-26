import { v } from 'convex/values';

import { COURSE_REQUEST_STAGES } from './courseRequests';

import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import type { CourseCardFilter, CourseCardStatus } from './types';
import type { CourseCardView, CourseModuleProgress, CourseRequestStage } from './types';

export const courseCardFilter = v.union(v.literal('all'), v.literal('building'), v.literal('ready'));

export const CARD_LIMIT = 24;

const COURSE_STATUS_STAGES: Record<Doc<'courses'>['status'], CourseRequestStage> = {
  queued: 'queued',
  planning: 'mapping',
  writing: 'writing',
  ready: 'published',
  failed: 'queued'
};

const WAITING_TAGLINE = 'Waiting for your Claude to pick this up.';

function readStepsBefore(stage: CourseRequestStage): CourseRequestStage[] {
  return COURSE_REQUEST_STAGES.slice(0, COURSE_REQUEST_STAGES.indexOf(stage));
}

function readConceptIds(pack: unknown): string[] {
  if (typeof pack !== 'object' || pack === null || !('conceptIds' in pack)) return [];
  const value: unknown = pack.conceptIds;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

export async function readCourseModuleProgress(
  context: QueryCtx,
  courseId: Id<'courses'>
): Promise<CourseModuleProgress> {
  const courseModules = await context.db
    .query('courseModules')
    .withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId))
    .collect();
  const conceptIds = new Set<string>();
  for (const courseModule of courseModules) {
    for (const conceptId of readConceptIds(courseModule.pack)) conceptIds.add(conceptId);
  }
  return {
    total: courseModules.length,
    ready: courseModules.filter((courseModule) => courseModule.status === 'ready').length,
    conceptCount: conceptIds.size
  };
}

function readCourseText(course: Doc<'courses'>): { title: string; tagline: string } {
  const meta = course.meta;
  if (typeof meta !== 'object' || meta === null) return { title: course.topic, tagline: '' };
  const title = 'title' in meta && typeof meta.title === 'string' ? meta.title : course.topic;
  const tagline = 'tagline' in meta && typeof meta.tagline === 'string' ? meta.tagline : '';
  return { title, tagline };
}

function readCourseStatus(course: Doc<'courses'>): CourseCardStatus {
  if (course.status === 'ready') return { kind: 'ready' };
  if (course.status === 'failed') return { kind: 'failed', reason: course.error ?? null };
  const stage = COURSE_STATUS_STAGES[course.status];
  return { kind: 'building', stage, stepsDone: readStepsBefore(stage) };
}

function readRequestStatus(request: Doc<'courseRequests'>): CourseCardStatus {
  if (request.status === 'failed') return { kind: 'failed', reason: request.error ?? null };
  if (request.status === 'published') return { kind: 'ready' };
  return { kind: 'building', stage: request.status, stepsDone: request.stepsDone };
}

function readRequestTagline(request: Doc<'courseRequests'>): string {
  if (request.goal) return request.goal;
  return request.status === 'queued' ? WAITING_TAGLINE : '';
}

export function toRequestCard(
  request: Doc<'courseRequests'>,
  course: Doc<'courses'> | null,
  modules: CourseModuleProgress | null
): CourseCardView {
  const courseText = course ? readCourseText(course) : null;
  return {
    key: request._id,
    title: courseText?.title ?? request.topic,
    tagline: courseText?.tagline || readRequestTagline(request),
    status: course ? readCourseStatus(course) : readRequestStatus(request),
    href: course && course.status !== 'failed' ? `/g/${course.slug}` : null,
    origin: request.origin,
    requestId: request._id,
    modules,
    createdAt: request._creationTime,
    updatedAt: request.updatedAt
  };
}

export function toCourseCard(course: Doc<'courses'>, modules: CourseModuleProgress): CourseCardView {
  const courseText = readCourseText(course);
  return {
    key: course._id,
    title: courseText.title,
    tagline: courseText.tagline,
    status: readCourseStatus(course),
    href: course.status === 'failed' ? null : `/g/${course.slug}`,
    origin: null,
    requestId: null,
    modules,
    createdAt: course._creationTime,
    updatedAt: course._creationTime
  };
}

export function keepCard(card: CourseCardView, filter: CourseCardFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'ready') return card.status.kind === 'ready';
  return card.status.kind === 'building';
}
