import { v } from 'convex/values';

import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from './_generated/server';
import { loadRequestForOwner, toCourseRequestView } from './courseRequests';
import { listStagesDone } from './lib/courseRequests';
import { countCourseChallenges, readPlannedModuleId } from './lib/courseDocuments';
import { pickFreeCourseSlug } from './lib/slug';

import type { Doc, Id } from './_generated/dataModel';
import type { CourseModuleView, CourseRequestStage, EngineStateView } from './lib/types';
import type { SaveMapResult, SaveResearchResult } from './lib/types';

const moduleOutline = v.object({ id: v.string(), n: v.number(), title: v.string(), summary: v.string() });

export async function readBuild(context: QueryCtx, requestId: Id<'courseRequests'>) {
  return await context.db
    .query('courseBuilds')
    .withIndex('by_request', (indexRange) => indexRange.eq('requestId', requestId))
    .unique();
}

export async function listCourseModules(context: QueryCtx, courseId: Id<'courses'>): Promise<Doc<'courseModules'>[]> {
  const rows = await context.db
    .query('courseModules')
    .withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId))
    .collect();
  return rows.sort((left, right) => left.n - right.n);
}

export function toModuleView(courseModule: Doc<'courseModules'>): CourseModuleView {
  return {
    id: readPlannedModuleId(courseModule.outline, courseModule.n),
    n: courseModule.n,
    status: courseModule.status,
    attempts: courseModule.attempts ?? 0,
    isUnverified: courseModule.unverified === true
  };
}

export async function reachStage(
  context: MutationCtx,
  request: Doc<'courseRequests'>,
  stage: CourseRequestStage
): Promise<void> {
  await context.db.patch(request._id, {
    status: stage,
    stepsDone: listStagesDone(request.stepsDone, stage),
    updatedAt: Date.now()
  });
}

export const readState = internalQuery({
  args: { ownerId: v.string(), requestId: v.string() },
  handler: async (context, { ownerId, requestId }): Promise<EngineStateView | null> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    if (!request) return null;
    const build = await readBuild(context, request._id);
    const course = request.courseId ? await context.db.get(request.courseId) : null;
    return {
      request: toCourseRequestView(request),
      sourceCount: build?.sources?.length ?? 0,
      map: build?.map ?? null,
      course: course
        ? {
            id: course._id,
            slug: course.slug,
            status: course.status,
            visibility: course.visibility,
            challengeCount: countCourseChallenges(course.meta)
          }
        : null,
      modules: course ? (await listCourseModules(context, course._id)).map(toModuleView) : []
    };
  }
});

export const readModulePacks = internalQuery({
  args: { ownerId: v.string(), requestId: v.string() },
  handler: async (context, { ownerId, requestId }): Promise<unknown[]> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    if (!request?.courseId) return [];
    const courseModules = await listCourseModules(context, request.courseId);
    return courseModules.map((courseModule) => courseModule.pack).filter((pack) => pack !== undefined);
  }
});

export const saveResearch = internalMutation({
  args: { ownerId: v.string(), requestId: v.string(), sources: v.array(v.any()) },
  handler: async (context, { ownerId, requestId, sources }): Promise<SaveResearchResult> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    if (!request) return { status: 'unknownRequest' };
    if (request.status !== 'queued' && request.status !== 'researching')
      return { status: 'wrongStage', stage: request.status };
    const build = await readBuild(context, request._id);
    const updatedAt = Date.now();
    if (build) await context.db.patch(build._id, { sources, updatedAt });
    else await context.db.insert('courseBuilds', { requestId: request._id, sources, updatedAt });
    await reachStage(context, request, 'researching');
    return { status: 'saved' };
  }
});

export const saveMap = internalMutation({
  args: { ownerId: v.string(), requestId: v.string(), map: v.any(), moduleOutlines: v.array(moduleOutline) },
  handler: async (context, { ownerId, requestId, map, moduleOutlines }): Promise<SaveMapResult> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    if (!request) return { status: 'unknownRequest' };
    if (request.status !== 'researching') return { status: 'wrongStage', stage: request.status };
    const build = await readBuild(context, request._id);
    const updatedAt = Date.now();
    if (build) await context.db.patch(build._id, { map, updatedAt });
    else await context.db.insert('courseBuilds', { requestId: request._id, map, updatedAt });

    const slug = await pickFreeCourseSlug(context, request.topic);
    const courseId = await context.db.insert('courses', {
      slug,
      ownerId,
      topic: request.topic,
      kind: 'concept',
      status: 'writing',
      visibility: 'unlisted',
      meta: { schemaVersion: 2, kind: 'concept', challenges: [] }
    });
    for (const outline of moduleOutlines)
      await context.db.insert('courseModules', {
        courseId,
        n: outline.n,
        status: 'pending',
        outline: { id: outline.id, title: outline.title, summary: outline.summary },
        attempts: 0
      });
    await context.db.insert('generationEvents', {
      courseId,
      message: `Concept map in: ${moduleOutlines.length} modules planned`,
      level: 'info'
    });
    await context.db.patch(request._id, { courseId });
    await reachStage(context, request, 'mapping');
    return { status: 'saved', slug, courseId };
  }
});
