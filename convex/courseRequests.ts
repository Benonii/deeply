import { v } from 'convex/values';

import { internalMutation, internalQuery, type QueryCtx } from './_generated/server';
import { courseRequestOrigin } from './lib/courseRequests';

import type { Doc, Id } from './_generated/dataModel';
import type { CourseRequestView } from './lib/types';

const LIST_LIMIT = 25;

export async function loadRequestForOwner(
  context: QueryCtx,
  ownerId: string,
  requestId: string
): Promise<Doc<'courseRequests'> | null> {
  const id = context.db.normalizeId('courseRequests', requestId);
  if (!id) return null;
  const request = await context.db.get(id);
  return request && request.ownerId === ownerId ? request : null;
}

export function toCourseRequestView(request: Doc<'courseRequests'>): CourseRequestView {
  return {
    id: request._id,
    topic: request.topic,
    goal: request.goal ?? null,
    status: request.status,
    stepsDone: request.stepsDone,
    origin: request.origin,
    courseId: request.courseId ?? null,
    error: request.error ?? null,
    createdAt: request._creationTime,
    updatedAt: request.updatedAt
  };
}

export const listForOwner = internalQuery({
  args: { ownerId: v.string() },
  handler: async (context, { ownerId }): Promise<CourseRequestView[]> => {
    const rows = await context.db
      .query('courseRequests')
      .withIndex('by_owner', (indexRange) => indexRange.eq('ownerId', ownerId))
      .order('desc')
      .take(LIST_LIMIT);
    return rows.map(toCourseRequestView);
  }
});

export const getForOwner = internalQuery({
  args: { ownerId: v.string(), requestId: v.string() },
  handler: async (context, { ownerId, requestId }): Promise<CourseRequestView | null> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    return request ? toCourseRequestView(request) : null;
  }
});

export const createForOwner = internalMutation({
  args: { ownerId: v.string(), topic: v.string(), goal: v.optional(v.string()), origin: courseRequestOrigin },
  handler: (context, { ownerId, topic, goal, origin }): Promise<Id<'courseRequests'>> =>
    context.db.insert('courseRequests', {
      ownerId,
      topic,
      ...(goal ? { goal } : {}),
      status: 'queued',
      stepsDone: [],
      origin,
      updatedAt: Date.now()
    })
});
