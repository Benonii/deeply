import { v } from 'convex/values';
import { internalMutation, internalQuery, type MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';

/**
 * Pipeline state for course generation. Actions (convex/generate/actions.ts)
 * do the slow work; these mutations record results and decide what runs next,
 * so each step is a separate, retryable scheduled function.
 */

export const MAX_CONCURRENT_WRITERS = 3;
export const MAX_ATTEMPTS = 2;

export const getCourse = internalQuery({
  args: { courseId: v.id('courses') },
  handler: (ctx, { courseId }) => ctx.db.get(courseId),
});

export const getModules = internalQuery({
  args: { courseId: v.id('courses') },
  handler: (ctx, { courseId }) =>
    ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', courseId)).collect(),
});

async function logEvent(ctx: MutationCtx, courseId: Id<'courses'>, message: string, level: 'info' | 'warn' | 'error' = 'info') {
  await ctx.db.insert('generationEvents', { courseId, message: message.slice(0, 500), level });
}

export const log = internalMutation({
  args: { courseId: v.id('courses'), message: v.string(), level: v.optional(v.union(v.literal('info'), v.literal('warn'), v.literal('error'))) },
  handler: (ctx, { courseId, message, level }) => logEvent(ctx, courseId, message, level ?? 'info'),
});

/** Planner is starting: bump attempts, mark planning. Returns false if this run is stale. */
export const beginPlanning = internalMutation({
  args: { courseId: v.id('courses') },
  handler: async (ctx, { courseId }) => {
    const c = await ctx.db.get(courseId);
    if (!c || (c.status !== 'queued' && c.status !== 'planning')) return false;
    await ctx.db.patch(courseId, { status: 'planning', attempts: (c.attempts ?? 0) + 1 });
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
  handler: async (ctx, { courseId, meta, outlines, context, repo }) => {
    const c = await ctx.db.get(courseId);
    if (!c || c.status !== 'planning') return; // stale or deleted
    const existing = await ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', courseId)).first();
    if (!existing) {
      for (let i = 0; i < outlines.length; i++) {
        await ctx.db.insert('courseModules', { courseId, n: i + 1, status: 'pending', outline: outlines[i], attempts: 0 });
      }
    }
    await ctx.db.patch(courseId, { meta, status: 'writing', challengesStatus: 'pending', context, repo });
    await logEvent(ctx, courseId, `Planned ${outlines.length} modules: ${outlines.map((o: { title: string }) => o.title).join(' · ')}`);
    await claimWork(ctx, courseId);
  },
});

/** Start writers up to the concurrency cap; when every module is settled, start challenges. */
async function claimWork(ctx: MutationCtx, courseId: Id<'courses'>) {
  const mods = await ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', courseId)).collect();
  let writing = mods.filter((m) => m.status === 'writing').length;
  for (const m of mods) {
    if (writing >= MAX_CONCURRENT_WRITERS) break;
    if (m.status !== 'pending') continue;
    await ctx.db.patch(m._id, { status: 'writing', attempts: (m.attempts ?? 0) + 1 });
    await ctx.scheduler.runAfter(0, internal.generate.actions.writeModule, { courseId, n: m.n });
    writing++;
  }
  const unsettled = mods.some((m) => m.status === 'pending' || m.status === 'writing') || writing > 0;
  const course = await ctx.db.get(courseId);
  if (!unsettled && course?.challengesStatus === 'pending') {
    if (!mods.some((m) => m.status === 'ready')) {
      await failCourse(ctx, course, 'Every module failed to generate.');
      return;
    }
    await ctx.db.patch(courseId, { challengesStatus: 'writing' });
    await ctx.scheduler.runAfter(0, internal.generate.actions.writeChallenges, { courseId });
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
  handler: async (ctx, { courseId, n, pack, codeRefs, error, dropped }) => {
    const m = await ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', courseId).eq('n', n)).unique();
    const course = await ctx.db.get(courseId);
    if (!m || !course || m.status !== 'writing') return;
    if (pack) {
      await ctx.db.patch(m._id, { status: 'ready', pack, error: undefined });
      if (codeRefs && Object.keys(codeRefs).length) {
        const meta = course.meta ?? {};
        await ctx.db.patch(courseId, { meta: { ...meta, codeRefs: { ...(meta.codeRefs ?? {}), ...codeRefs } } });
      }
      const refsNote = codeRefs ? `, ${Object.keys(codeRefs).length} verified code excerpts${dropped ? ` (${dropped} unresolvable dropped)` : ''}` : '';
      await logEvent(ctx, courseId, `Module ${n} ready: ${pack.title} (${pack.sections.length} sections${refsNote})`);
    } else if ((m.attempts ?? 1) < MAX_ATTEMPTS) {
      await ctx.db.patch(m._id, { status: 'pending', error });
      await logEvent(ctx, courseId, `Module ${n} failed, retrying: ${error}`, 'warn');
    } else {
      await ctx.db.patch(m._id, { status: 'failed', error });
      await logEvent(ctx, courseId, `Module ${n} could not be generated: ${error}`, 'error');
    }
    await claimWork(ctx, courseId);
  },
});

export const challengesResult = internalMutation({
  args: { courseId: v.id('courses'), challenges: v.optional(v.array(v.any())), error: v.optional(v.string()) },
  handler: async (ctx, { courseId, challenges, error }) => {
    const c = await ctx.db.get(courseId);
    if (!c || c.challengesStatus !== 'writing') return;
    if (challenges) {
      await ctx.db.patch(courseId, { meta: { ...(c.meta ?? {}), challenges }, challengesStatus: 'ready' });
      await logEvent(ctx, courseId, `Wrote ${challenges.length} challenges`);
    } else {
      await ctx.db.patch(courseId, { challengesStatus: 'failed' });
      await logEvent(ctx, courseId, `Challenges could not be generated: ${error}`, 'warn');
    }
    const mods = await ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', courseId)).collect();
    const failed = mods.filter((m) => m.status === 'failed').length;
    await ctx.db.patch(courseId, { status: 'ready' });
    await logEvent(ctx, courseId, failed ? `Course ready with ${failed} missing module(s)` : 'Course ready', failed ? 'warn' : 'info');
  },
});

async function failCourse(ctx: MutationCtx, course: Doc<'courses'>, error: string) {
  await ctx.db.patch(course._id, { status: 'failed', error });
  await logEvent(ctx, course._id, `Generation failed: ${error}`, 'error');
  try {
    if (!course.chargeRef) throw new Error('no charge recorded');
    await ctx.runMutation(internal.wallet.refund, { userId: course.ownerId, kind: 'generateCourse', ref: course.chargeRef });
    await logEvent(ctx, course._id, 'Credits refunded');
  } catch (e) {
    await logEvent(ctx, course._id, `Refund failed, contact support: ${(e as Error).message}`, 'error');
  }
}

/** Planner failed: retry once, otherwise fail the course and refund. */
export const planFailed = internalMutation({
  args: { courseId: v.id('courses'), error: v.string(), retryable: v.boolean() },
  handler: async (ctx, { courseId, error, retryable }) => {
    const c = await ctx.db.get(courseId);
    if (!c || c.status !== 'planning') return;
    if (retryable && (c.attempts ?? 1) < MAX_ATTEMPTS) {
      await ctx.db.patch(courseId, { status: 'queued' });
      await logEvent(ctx, courseId, `Planning failed, retrying: ${error}`, 'warn');
      await ctx.scheduler.runAfter(5_000, internal.generate.actions.plan, { courseId });
      return;
    }
    await failCourse(ctx, c, error);
  },
});

export const WATCHDOG_MS = 12 * 60 * 1000; // longer than any single action can run

/**
 * Recovers from actions that crashed without reporting (runtime errors,
 * deploys mid-run): anything stuck past the action time limit is retried
 * once or failed, so a course never hangs with credits charged.
 */
export const watchdog = internalMutation({
  args: { courseId: v.id('courses') },
  handler: async (ctx, { courseId }) => {
    const c = await ctx.db.get(courseId);
    if (!c || c.status === 'ready' || c.status === 'failed') return;
    const last = await ctx.db.query('generationEvents').withIndex('by_course', (q) => q.eq('courseId', courseId)).order('desc').first();
    const idle = Date.now() - (last?._creationTime ?? c._creationTime);
    if (idle < WATCHDOG_MS) {
      await ctx.scheduler.runAfter(WATCHDOG_MS - idle + 1000, internal.generate.state.watchdog, { courseId });
      return;
    }
    if (c.status === 'queued' || c.status === 'planning') {
      if ((c.attempts ?? 0) < MAX_ATTEMPTS) {
        await ctx.db.patch(courseId, { status: 'queued' });
        await logEvent(ctx, courseId, 'Planning stalled, retrying', 'warn');
        await ctx.scheduler.runAfter(0, internal.generate.actions.plan, { courseId });
      } else {
        await failCourse(ctx, c, 'Planning stalled.');
        return;
      }
    } else {
      const mods = await ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', courseId)).collect();
      for (const m of mods.filter((m) => m.status === 'writing')) {
        if ((m.attempts ?? 1) < MAX_ATTEMPTS) await ctx.db.patch(m._id, { status: 'pending' });
        else await ctx.db.patch(m._id, { status: 'failed', error: 'stalled' });
        await logEvent(ctx, courseId, `Module ${m.n} stalled`, 'warn');
      }
      if (c.challengesStatus === 'writing') {
        await ctx.db.patch(courseId, { challengesStatus: 'failed', status: 'ready' });
        await logEvent(ctx, courseId, 'Challenges stalled; course published without them', 'warn');
        return;
      }
      await claimWork(ctx, courseId);
    }
    await ctx.scheduler.runAfter(WATCHDOG_MS, internal.generate.state.watchdog, { courseId });
  },
});
