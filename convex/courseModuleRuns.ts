import { v } from 'convex/values';

import { internalMutation, internalQuery } from './_generated/server';
import { checkMode } from './checks/validators';
import { listCourseModules, reachStage, toModuleView } from './courseBuilds';
import { loadRequestForOwner } from './courseRequests';
import { readPlannedModuleId } from './lib/courseDocuments';

import type { Doc } from './_generated/dataModel';
import type { BeginAttemptResult, CheckRunView, FinishAttemptResult, ModuleFate } from './lib/types';

const checkRunRow = v.object({
  checkId: v.string(),
  version: v.string(),
  mode: checkMode,
  pass: v.boolean(),
  problems: v.array(v.object({ where: v.string(), message: v.string() })),
  fixNote: v.string()
});

const moduleFate = v.union(v.literal('pass'), v.literal('retry'), v.literal('publish-unverified'));

function findModuleRow(courseModules: Doc<'courseModules'>[], moduleId: string): Doc<'courseModules'> | undefined {
  return courseModules.find((courseModule) => readPlannedModuleId(courseModule.outline, courseModule.n) === moduleId);
}

const FATE_EVENTS: Record<ModuleFate, (moduleId: string, attempt: number) => string> = {
  pass: (moduleId, attempt) => `Module ${moduleId} passed its checks on attempt ${attempt}`,
  retry: (moduleId, attempt) => `Module ${moduleId} failed its checks on attempt ${attempt}, rewriting`,
  'publish-unverified': (moduleId, attempt) =>
    `Module ${moduleId} still failed on attempt ${attempt} and is stored unverified`
};

export const beginAttempt = internalMutation({
  args: { ownerId: v.string(), requestId: v.string(), moduleId: v.string() },
  handler: async (context, { ownerId, requestId, moduleId }): Promise<BeginAttemptResult> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    if (!request) return { status: 'unknownRequest' };
    if (!request.courseId) return { status: 'noCourse' };
    if (request.status === 'published') return { status: 'wrongStage', stage: request.status };
    const courseModule = findModuleRow(await listCourseModules(context, request.courseId), moduleId);
    if (!courseModule) return { status: 'unknownModule' };
    const attempt = (courseModule.attempts ?? 0) + 1;
    await context.db.patch(courseModule._id, { attempts: attempt });
    return { status: 'begun', attempt };
  }
});

export const finishAttempt = internalMutation({
  args: {
    ownerId: v.string(),
    requestId: v.string(),
    moduleId: v.string(),
    attempt: v.number(),
    fate: moduleFate,
    pack: v.optional(v.any()),
    results: v.array(checkRunRow)
  },
  handler: async (context, args): Promise<FinishAttemptResult> => {
    const request = await loadRequestForOwner(context, args.ownerId, args.requestId);
    if (!request) return { status: 'unknownRequest' };
    if (!request.courseId) return { status: 'noCourse' };
    const courseModules = await listCourseModules(context, request.courseId);
    const courseModule = findModuleRow(courseModules, args.moduleId);
    if (!courseModule) return { status: 'unknownModule' };
    for (const result of args.results)
      await context.db.insert('checkRuns', {
        requestId: request._id,
        moduleId: args.moduleId,
        attempt: args.attempt,
        ...result
      });
    if (args.fate !== 'retry')
      await context.db.patch(courseModule._id, {
        status: 'ready',
        pack: args.pack,
        error: undefined,
        unverified: args.fate === 'publish-unverified' ? true : undefined
      });
    await context.db.insert('generationEvents', {
      courseId: request.courseId,
      message: FATE_EVENTS[args.fate](args.moduleId, args.attempt),
      level: args.fate === 'pass' ? 'info' : 'warn'
    });
    const stored = await listCourseModules(context, request.courseId);
    const isEveryModuleReady = stored.every((row) => row.status === 'ready');
    await reachStage(context, request, isEveryModuleReady ? 'checking' : 'writing');
    return { status: 'stored', modules: stored.map(toModuleView), isEveryModuleReady };
  }
});

export const listRuns = internalQuery({
  args: { ownerId: v.string(), requestId: v.string() },
  handler: async (context, { ownerId, requestId }): Promise<CheckRunView[]> => {
    const request = await loadRequestForOwner(context, ownerId, requestId);
    if (!request) return [];
    const rows = await context.db
      .query('checkRuns')
      .withIndex('by_module_attempt', (indexRange) => indexRange.eq('requestId', request._id))
      .collect();
    return rows.map((row) => ({
      moduleId: row.moduleId,
      attempt: row.attempt,
      checkId: row.checkId,
      version: row.version,
      mode: row.mode,
      pass: row.pass,
      problemCount: row.problems.length,
      fixNote: row.fixNote
    }));
  }
});
