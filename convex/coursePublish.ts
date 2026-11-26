import { v } from 'convex/values';

import { internalMutation } from './_generated/server';
import { listCourseModules, reachStage, toModuleView } from './courseBuilds';
import { loadRequestForOwner } from './courseRequests';

import type { PublishCourseResult, SaveChallengesResult } from './lib/types';

export const saveChallenges = internalMutation({
  args: { ownerId: v.string(), requestId: v.string(), challenges: v.array(v.any()) },
  handler: async (context, { ownerId, requestId, challenges }): Promise<SaveChallengesResult> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    if (!request) return { status: 'unknownRequest' };
    if (!request.courseId) return { status: 'noCourse' };
    const course = await context.db.get(request.courseId);
    if (!course) return { status: 'noCourse' };
    await context.db.patch(course._id, { meta: { ...course.meta, challenges } });
    return { status: 'saved', challengeCount: challenges.length };
  }
});

export const publishCourse = internalMutation({
  args: {
    ownerId: v.string(),
    requestId: v.string(),
    title: v.string(),
    tagline: v.string(),
    summary: v.string(),
    brand: v.any()
  },
  handler: async (context, { ownerId, requestId, title, tagline, summary, brand }): Promise<PublishCourseResult> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    if (!request) return { status: 'unknownRequest' };
    if (!request.courseId) return { status: 'noCourse' };
    const course = await context.db.get(request.courseId);
    if (!course) return { status: 'noCourse' };
    if (request.status === 'published') return { status: 'alreadyPublished', slug: course.slug };
    const courseModules = await listCourseModules(context, course._id);
    const pending = courseModules.filter((courseModule) => courseModule.status !== 'ready');
    if (pending.length > 0 || courseModules.length === 0)
      return { status: 'modulesPending', pending: pending.map(toModuleView) };

    await context.db.patch(course._id, {
      status: 'ready',
      meta: { ...course.meta, id: course.slug, title, tagline, summary, brand, kind: 'concept', schemaVersion: 2 }
    });
    await context.db.insert('generationEvents', {
      courseId: course._id,
      message: `Published: ${title}`,
      level: 'info'
    });
    await reachStage(context, request, 'published');
    return {
      status: 'published',
      slug: course.slug,
      moduleCount: courseModules.length,
      unverifiedCount: courseModules.filter((courseModule) => courseModule.unverified === true).length
    };
  }
});
