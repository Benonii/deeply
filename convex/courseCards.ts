import { v } from 'convex/values';

import { internalQuery, query, type QueryCtx } from './_generated/server';
import { currentUser } from './auth';
import { CARD_LIMIT, courseCardFilter, keepCard } from './lib/courseCards';
import { readCourseModuleProgress, toCourseCard, toRequestCard } from './lib/courseCards';

import type { Doc, Id } from './_generated/dataModel';
import type { CourseCardFilter, CourseCardView } from './lib/types';

async function readOwnerId(context: QueryCtx): Promise<string | null> {
  const user = await currentUser(context);
  return user ? String(user._id) : null;
}

async function readLinkedCourse(context: QueryCtx, courseId: Id<'courses'> | undefined) {
  return courseId ? await context.db.get(courseId) : null;
}

async function buildRequestCard(context: QueryCtx, request: Doc<'courseRequests'>): Promise<CourseCardView> {
  const course = await readLinkedCourse(context, request.courseId);
  const modules = course ? await readCourseModuleProgress(context, course._id) : null;
  return toRequestCard(request, course, modules);
}

async function readCards(context: QueryCtx, ownerId: string, filter: CourseCardFilter): Promise<CourseCardView[]> {
  const requests = await context.db
    .query('courseRequests')
    .withIndex('by_owner', (indexRange) => indexRange.eq('ownerId', ownerId))
    .order('desc')
    .take(CARD_LIMIT);
  const courses = await context.db
    .query('courses')
    .withIndex('by_owner', (indexRange) => indexRange.eq('ownerId', ownerId))
    .order('desc')
    .take(CARD_LIMIT);

  const cards: CourseCardView[] = [];
  const linkedCourseIds = new Set(requests.map((request) => request.courseId));
  for (const request of requests) cards.push(await buildRequestCard(context, request));
  for (const course of courses) {
    if (linkedCourseIds.has(course._id)) continue;
    cards.push(toCourseCard(course, await readCourseModuleProgress(context, course._id)));
  }

  return cards
    .filter((card) => keepCard(card, filter))
    .sort((first, second) => second.updatedAt - first.updatedAt)
    .slice(0, CARD_LIMIT);
}

export const mine = query({
  args: { filter: courseCardFilter },
  handler: async (context, { filter }): Promise<CourseCardView[]> => {
    const ownerId = await readOwnerId(context);
    return ownerId ? readCards(context, ownerId, filter) : [];
  }
});

export const myRequest = query({
  args: { requestId: v.string() },
  handler: async (context, { requestId }): Promise<CourseCardView | null> => {
    const ownerId = await readOwnerId(context);
    if (!ownerId) return null;
    const id = context.db.normalizeId('courseRequests', requestId);
    if (!id) return null;
    const request = await context.db.get(id);
    if (!request || request.ownerId !== ownerId) return null;
    return buildRequestCard(context, request);
  }
});

export const countForOwner = internalQuery({
  args: { ownerId: v.string(), filter: courseCardFilter },
  handler: async (context, { ownerId, filter }): Promise<number> => (await readCards(context, ownerId, filter)).length
});
