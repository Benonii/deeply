import { v } from 'convex/values';
import { internalMutation, mutation, query, type QueryCtx, type MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { currentUser } from './auth';
import { rateLimiter } from './rateLimits';
import { COST } from './lib/pricing';
import { parseRepoUrl } from './generate/github';
import { WATCHDOG_MS } from './generate/state';

/** Better Auth user id, or null when signed out. */
async function userId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const user = await currentUser(ctx);
  return user ? String(user._id) : null;
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?github\.com\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'course'
  );
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

async function moduleCounts(ctx: QueryCtx, courseId: import('./_generated/dataModel').Id<'courses'>) {
  const mods = await ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', courseId)).collect();
  return { moduleCount: mods.length, readyModules: mods.filter((m) => m.status === 'ready').length };
}

/** Public catalog: ready or in-progress public courses, newest first. */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const out = [];
    for (const status of ['ready', 'writing'] as const) {
      const rows = await ctx.db
        .query('courses')
        .withIndex('by_status_visibility', (q) => q.eq('status', status).eq('visibility', 'public'))
        .order('desc')
        .take(50);
      for (const c of rows) {
        out.push({
          slug: c.slug,
          title: c.meta?.title ?? c.topic,
          tagline: c.meta?.tagline ?? '',
          kind: c.kind,
          brand: c.meta?.brand ?? null,
          status: c.status,
          ...(await moduleCounts(ctx, c._id)),
          createdAt: c._creationTime,
        });
      }
    }
    return out.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  },
});

/** A course and its modules. Unlisted courses are readable by anyone with the link. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const c = await ctx.db.query('courses').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();
    if (!c) return null;
    const me = await userId(ctx);
    const mods = await ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', c._id)).collect();
    return {
      course: {
        id: c._id,
        slug: c.slug,
        status: c.status,
        topic: c.topic,
        kind: c.kind,
        repo: c.repo ?? null,
        visibility: c.visibility,
        meta: c.meta ?? null,
        error: c.error ?? null,
        challengesStatus: c.challengesStatus ?? null,
        isOwner: me === c.ownerId,
        createdAt: c._creationTime,
      },
      modules: mods.map((m) => ({ n: m.n, status: m.status, outline: m.outline, pack: m.pack ?? null, error: m.error ?? null })),
    };
  },
});

export const myCourses = query({
  args: {},
  handler: async (ctx) => {
    const me = await userId(ctx);
    if (!me) return [];
    const rows = await ctx.db.query('courses').withIndex('by_owner', (q) => q.eq('ownerId', me)).order('desc').take(50);
    const out = [];
    for (const c of rows) {
      out.push({
        slug: c.slug,
        title: c.meta?.title ?? c.topic,
        topic: c.topic,
        kind: c.kind,
        status: c.status,
        visibility: c.visibility,
        ...(await moduleCounts(ctx, c._id)),
        createdAt: c._creationTime,
      });
    }
    return out;
  },
});

/** Live generation log (most recent 50, oldest first). */
export const events = query({
  args: { courseId: v.id('courses') },
  handler: async (ctx, { courseId }) => {
    const rows = await ctx.db.query('generationEvents').withIndex('by_course', (q) => q.eq('courseId', courseId)).order('desc').take(50);
    return rows.reverse().map((e) => ({ id: e._id, at: e._creationTime, message: e.message, level: e.level }));
  },
});

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

type CreateResult =
  | { status: 'ok'; slug: string }
  | { status: 'auth' }
  | { status: 'credits'; needed: number }
  | { status: 'rate'; retryAfterMs: number }
  | { status: 'invalid'; message: string };

const createArgs = {
  topic: v.string(),
  kind: v.union(v.literal('concept'), v.literal('repo')),
  repoUrl: v.optional(v.string()),
  visibility: v.union(v.literal('public'), v.literal('unlisted')),
};

export const create = mutation({
  args: createArgs,
  handler: async (ctx, args): Promise<CreateResult> => {
    const me = await userId(ctx);
    if (!me) return { status: 'auth' };
    return startCourse(ctx, me, args);
  },
});

/** Same as `create` for a given user. Internal only: used by tests and admin tooling. */
export const createForUser = internalMutation({
  args: { userId: v.string(), ...createArgs },
  handler: (ctx, { userId: uid, ...args }) => startCourse(ctx, uid, args),
});

async function startCourse(
  ctx: MutationCtx,
  me: string,
  args: { topic: string; kind: 'concept' | 'repo'; repoUrl?: string; visibility: 'public' | 'unlisted' },
): Promise<CreateResult> {
  let topic = args.topic.trim().replace(/\s+/g, ' ');
  let repo: { owner: string; name: string } | null = null;
  if (args.kind === 'repo') {
    repo = parseRepoUrl(args.repoUrl ?? args.topic);
    if (!repo) return { status: 'invalid', message: 'Enter a GitHub repository URL like https://github.com/owner/name.' };
    if (topic.length < 3 || /github\.com/.test(topic)) topic = `${repo.owner}/${repo.name}`;
  }
  if (topic.length < 3 || topic.length > 200) return { status: 'invalid', message: 'The topic must be 3 to 200 characters.' };

  // Per-user then global limits. Check both before consuming either.
  const perUser = await rateLimiter.check(ctx, 'generateCourse', { key: me });
  if (!perUser.ok) return { status: 'rate', retryAfterMs: perUser.retryAfter ?? 60_000 };
  const daily = await rateLimiter.check(ctx, 'generateCourseDaily', { key: me });
  if (!daily.ok) return { status: 'rate', retryAfterMs: daily.retryAfter ?? 3_600_000 };
  const global = await rateLimiter.check(ctx, 'generateCourseGlobal');
  if (!global.ok) return { status: 'rate', retryAfterMs: global.retryAfter ?? 60_000 };

  let slug = slugify(topic);
  while (await ctx.db.query('courses').withIndex('by_slug', (q) => q.eq('slug', slug)).first()) {
    slug = `${slugify(topic).slice(0, 34)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const chargeRef = `course:${slug}:${Date.now()}`;
  const charged = await ctx.runMutation(internal.wallet.charge, { userId: me, kind: 'generateCourse', ref: chargeRef });
  if (!chargeOk(charged)) return { status: 'credits', needed: COST.generateCourse };
  await rateLimiter.limit(ctx, 'generateCourse', { key: me });
  await rateLimiter.limit(ctx, 'generateCourseDaily', { key: me });
  await rateLimiter.limit(ctx, 'generateCourseGlobal');

  const courseId = await ctx.db.insert('courses', {
    slug,
    ownerId: me,
    topic,
    kind: args.kind,
    repo: repo ? { ...repo, sha: '' } : undefined,
    status: 'queued',
    visibility: args.visibility,
    chargeRef,
  });
  await ctx.db.insert('generationEvents', { courseId, message: `Queued: ${topic} (${COST.generateCourse} credits)`, level: 'info' });
  await ctx.scheduler.runAfter(0, internal.generate.actions.plan, { courseId });
  await ctx.scheduler.runAfter(WATCHDOG_MS, internal.generate.state.watchdog, { courseId });
  return { status: 'ok', slug };
}

/** Accepts the wallet's charge result whether it returns a boolean or `{ ok }`. */
function chargeOk(r: unknown): boolean {
  if (typeof r === 'boolean') return r;
  if (r && typeof r === 'object' && 'ok' in r) return Boolean((r as { ok: unknown }).ok);
  return r !== null && r !== undefined;
}

export const setVisibility = mutation({
  args: { slug: v.string(), visibility: v.union(v.literal('public'), v.literal('unlisted')) },
  handler: async (ctx, { slug, visibility }) => {
    const me = await userId(ctx);
    const c = await ctx.db.query('courses').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();
    if (!c || !me || c.ownerId !== me) throw new Error('Not your course');
    await ctx.db.patch(c._id, { visibility });
  },
});

export const remove = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const me = await userId(ctx);
    const c = await ctx.db.query('courses').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();
    if (!c || !me || c.ownerId !== me) throw new Error('Not your course');
    for (const m of await ctx.db.query('courseModules').withIndex('by_course', (q) => q.eq('courseId', c._id)).collect()) await ctx.db.delete(m._id);
    for (const e of await ctx.db.query('generationEvents').withIndex('by_course', (q) => q.eq('courseId', c._id)).collect()) await ctx.db.delete(e._id);
    if (c.context) await ctx.storage.delete(c.context);
    await ctx.db.delete(c._id);
  },
});
