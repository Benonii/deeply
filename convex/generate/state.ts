import { v } from 'convex/values';
import { internalMutation, internalQuery, type MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';


export const MAX_CONCURRENT_WRITERS = 3;
export const MAX_ATTEMPTS = 2;

export const getCourse = internalQuery({
  args: { courseId: v.id('courses') },
  handler: (context, { courseId }) => context.db.get(courseId),
});

export const getModules = internalQuery({
  args: { courseId: v.id('courses') },
  handler: (context, { courseId }) =>
    context.db.query('courseModules').withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId)).collect(),
});

async function logEvent(context: MutationCtx, courseId: Id<'courses'>, message: string, level: 'info' | 'warn' | 'error' = 'info') {
  await context.db.insert('generationEvents', { courseId, message: message.slice(0, 500), level });
}

export const log = internalMutation({
  args: { courseId: v.id('courses'), message: v.string(), level: v.optional(v.union(v.literal('info'), v.literal('warn'), v.literal('error'))) },
  handler: (context, { courseId, message, level }) => logEvent(context, courseId, message, level ?? 'info'),
});

export const beginPlanning = internalMutation({
  args: { courseId: v.id('courses') },
  handler: async (context, { courseId }) => {
    const course = await context.db.get(courseId);
    if (!course || (course.status !== 'queued' && course.status !== 'planning')) return false;
    await context.db.patch(courseId, { status: 'planning', attempts: (course.attempts ?? 0) + 1 });
    return true;
  },
});

export const savePlan = internalMutation({
  args: {
    courseId: v.id('courses'),
    meta: v.any(),
    outlines: v.array(v.any()),
    context: v.optional(v.id('_storage')),
    repo: v.optional(v.object({ owner: v.string(), name: v.string(), sha: v.string() })),
  },
  handler: async (mutationContext, { courseId, meta, outlines, context, repo }) => {
    const course = await mutationContext.db.get(courseId);
    if (!course || course.status !== 'planning') return;
    const existing = await mutationContext.db.query('courseModules').withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId)).first();
    if (!existing) {
      for (let index = 0; index < outlines.length; index++) {
        await mutationContext.db.insert('courseModules', { courseId, n: index + 1, status: 'pending', outline: outlines[index], attempts: 0 });
      }
    }
    await mutationContext.db.patch(courseId, { meta, status: 'writing', challengesStatus: 'pending', context, repo });
    await logEvent(mutationContext, courseId, `Planned ${outlines.length} modules: ${outlines.map((outline: { title: string }) => outline.title).join(' · ')}`);
    await claimWork(mutationContext, courseId);
  },
});

async function claimWork(context: MutationCtx, courseId: Id<'courses'>) {
  const courseModules = await context.db.query('courseModules').withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId)).collect();
  let writing = courseModules.filter((courseModule) => courseModule.status === 'writing').length;
  for (const moduleRecord of courseModules) {
    if (writing >= MAX_CONCURRENT_WRITERS) break;
    if (moduleRecord.status !== 'pending') continue;
    await context.db.patch(moduleRecord._id, { status: 'writing', attempts: (moduleRecord.attempts ?? 0) + 1 });
    await context.scheduler.runAfter(0, internal.generate.actions.writeModule, { courseId, n: moduleRecord.n });
    writing++;
  }
  const unsettled = courseModules.some((courseModule) => courseModule.status === 'pending' || courseModule.status === 'writing') || writing > 0;
  const course = await context.db.get(courseId);
  if (!unsettled && course?.challengesStatus === 'pending') {
    if (!courseModules.some((courseModule) => courseModule.status === 'ready')) {
      await failCourse(context, course, 'Every module failed to generate.');
      return;
    }
    await context.db.patch(courseId, { challengesStatus: 'writing' });
    await context.scheduler.runAfter(0, internal.generate.actions.writeChallenges, { courseId });
  }
}

export const moduleResult = internalMutation({
  args: {
    courseId: v.id('courses'),
    n: v.number(),
    pack: v.optional(v.any()),
    codeRefs: v.optional(v.any()),
    error: v.optional(v.string()),
    dropped: v.optional(v.number()),
  },
  handler: async (context, { courseId, n: moduleNumber, pack, codeRefs, error, dropped }) => {
    const courseModule = await context.db.query('courseModules').withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId).eq('n', moduleNumber)).unique();
    const course = await context.db.get(courseId);
    if (!courseModule || !course || courseModule.status !== 'writing') return;
    if (pack) {
      await context.db.patch(courseModule._id, { status: 'ready', pack, error: undefined });
      if (codeRefs && Object.keys(codeRefs).length) {
        const meta = course.meta ?? {};
        await context.db.patch(courseId, { meta: { ...meta, codeRefs: { ...(meta.codeRefs ?? {}), ...codeRefs } } });
      }
      const refsNote = codeRefs ? `, ${Object.keys(codeRefs).length} verified code excerpts${dropped ? ` (${dropped} unresolvable dropped)` : ''}` : '';
      await logEvent(context, courseId, `Module ${moduleNumber} ready: ${pack.title} (${pack.sections.length} sections${refsNote})`);
    } else if ((courseModule.attempts ?? 1) < MAX_ATTEMPTS) {
      await context.db.patch(courseModule._id, { status: 'pending', error });
      await logEvent(context, courseId, `Module ${moduleNumber} failed, retrying: ${error}`, 'warn');
    } else {
      await context.db.patch(courseModule._id, { status: 'failed', error });
      await logEvent(context, courseId, `Module ${moduleNumber} could not be generated: ${error}`, 'error');
    }
    await claimWork(context, courseId);
  },
});

export const challengesResult = internalMutation({
  args: { courseId: v.id('courses'), challenges: v.optional(v.array(v.any())), error: v.optional(v.string()) },
  handler: async (context, { courseId, challenges, error }) => {
    const course = await context.db.get(courseId);
    if (!course || course.challengesStatus !== 'writing') return;
    if (challenges) {
      await context.db.patch(courseId, { meta: { ...(course.meta ?? {}), challenges }, challengesStatus: 'ready' });
      await logEvent(context, courseId, `Wrote ${challenges.length} challenges`);
    } else {
      await context.db.patch(courseId, { challengesStatus: 'failed' });
      await logEvent(context, courseId, `Challenges could not be generated: ${error}`, 'warn');
    }
    const courseModules = await context.db.query('courseModules').withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId)).collect();
    const failed = courseModules.filter((courseModule) => courseModule.status === 'failed').length;
    await context.db.patch(courseId, { status: 'ready' });
    await logEvent(context, courseId, failed ? `Course ready with ${failed} missing module(s)` : 'Course ready', failed ? 'warn' : 'info');
  },
});

async function failCourse(context: MutationCtx, course: Doc<'courses'>, error: string) {
  await context.db.patch(course._id, { status: 'failed', error });
  await logEvent(context, course._id, `Generation failed: ${error}`, 'error');
  try {
    if (!course.chargeRef) throw new Error('no charge recorded');
    await context.runMutation(internal.wallet.refund, { userId: course.ownerId, kind: 'generateCourse', ref: course.chargeRef });
    await logEvent(context, course._id, 'Credits refunded');
  } catch (error) {
    await logEvent(context, course._id, `Refund failed, contact support: ${(error as Error).message}`, 'error');
  }
}

export const planFailed = internalMutation({
  args: { courseId: v.id('courses'), error: v.string(), retryable: v.boolean() },
  handler: async (context, { courseId, error, retryable }) => {
    const course = await context.db.get(courseId);
    if (!course || course.status !== 'planning') return;
    if (retryable && (course.attempts ?? 1) < MAX_ATTEMPTS) {
      await context.db.patch(courseId, { status: 'queued' });
      await logEvent(context, courseId, `Planning failed, retrying: ${error}`, 'warn');
      await context.scheduler.runAfter(5_000, internal.generate.actions.plan, { courseId });
      return;
    }
    await failCourse(context, course, error);
  },
});

export const WATCHDOG_MS = 12 * 60 * 1000;

export const watchdog = internalMutation({
  args: { courseId: v.id('courses') },
  handler: async (context, { courseId }) => {
    const course = await context.db.get(courseId);
    if (!course || course.status === 'ready' || course.status === 'failed') return;
    const last = await context.db.query('generationEvents').withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId)).order('desc').first();
    const idle = Date.now() - (last?._creationTime ?? course._creationTime);
    if (idle < WATCHDOG_MS) {
      await context.scheduler.runAfter(WATCHDOG_MS - idle + 1000, internal.generate.state.watchdog, { courseId });
      return;
    }
    if (course.status === 'queued' || course.status === 'planning') {
      if ((course.attempts ?? 0) < MAX_ATTEMPTS) {
        await context.db.patch(courseId, { status: 'queued' });
        await logEvent(context, courseId, 'Planning stalled, retrying', 'warn');
        await context.scheduler.runAfter(0, internal.generate.actions.plan, { courseId });
      } else {
        await failCourse(context, course, 'Planning stalled.');
        return;
      }
    } else {
      const courseModules = await context.db.query('courseModules').withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId)).collect();
      for (const courseModule of courseModules.filter((courseModule) => courseModule.status === 'writing')) {
        if ((courseModule.attempts ?? 1) < MAX_ATTEMPTS) await context.db.patch(courseModule._id, { status: 'pending' });
        else await context.db.patch(courseModule._id, { status: 'failed', error: 'stalled' });
        await logEvent(context, courseId, `Module ${courseModule.n} stalled`, 'warn');
      }
      if (course.challengesStatus === 'writing') {
        await context.db.patch(courseId, { challengesStatus: 'failed', status: 'ready' });
        await logEvent(context, courseId, 'Challenges stalled; course published without them', 'warn');
        return;
      }
      await claimWork(context, courseId);
    }
    await context.scheduler.runAfter(WATCHDOG_MS, internal.generate.state.watchdog, { courseId });
  },
});
