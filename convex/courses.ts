import { v } from 'convex/values';
import { internalMutation, mutation, query, type QueryCtx, type MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { currentUser } from './auth';
import { rateLimiter } from './rateLimits';
import { COST } from './lib/pricing';
import { parseRepoUrl } from './generate/github';
import { WATCHDOG_MS } from './generate/state';

async function userId(context: QueryCtx | MutationCtx): Promise<string | null> {
  const user = await currentUser(context);
  return user ? String(user._id) : null;
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?github\.com\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'course'
  );
}

async function moduleCounts(context: QueryCtx, courseId: import('./_generated/dataModel').Id<'courses'>) {
  const courseModules = await context.db
    .query('courseModules')
    .withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId))
    .collect();
  return {
    moduleCount: courseModules.length,
    readyModules: courseModules.filter((courseModule) => courseModule.status === 'ready').length
  };
}

export const listPublic = query({
  args: {},
  handler: async (context) => {
    const out = [];
    for (const status of ['ready', 'writing'] as const) {
      const rows = await context.db
        .query('courses')
        .withIndex('by_status_visibility', (indexRange) => indexRange.eq('status', status).eq('visibility', 'public'))
        .order('desc')
        .take(50);
      for (const course of rows) {
        out.push({
          slug: course.slug,
          title: course.meta?.title ?? course.topic,
          tagline: course.meta?.tagline ?? '',
          kind: course.kind,
          brand: course.meta?.brand ?? null,
          status: course.status,
          ...(await moduleCounts(context, course._id)),
          createdAt: course._creationTime
        });
      }
    }
    return out.sort((first, second) => second.createdAt - first.createdAt).slice(0, 50);
  }
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (context, { slug }) => {
    const course = await context.db
      .query('courses')
      .withIndex('by_slug', (indexRange) => indexRange.eq('slug', slug))
      .unique();
    if (!course) return null;
    const me = await userId(context);
    const courseModules = await context.db
      .query('courseModules')
      .withIndex('by_course', (indexRange) => indexRange.eq('courseId', course._id))
      .collect();
    return {
      course: {
        id: course._id,
        slug: course.slug,
        status: course.status,
        topic: course.topic,
        kind: course.kind,
        repo: course.repo ?? null,
        visibility: course.visibility,
        meta: course.meta ?? null,
        error: course.error ?? null,
        challengesStatus: course.challengesStatus ?? null,
        isOwner: me === course.ownerId,
        createdAt: course._creationTime
      },
      modules: courseModules.map((courseModule) => ({
        n: courseModule.n,
        status: courseModule.status,
        outline: courseModule.outline,
        pack: courseModule.pack ?? null,
        error: courseModule.error ?? null
      }))
    };
  }
});

export const myCourses = query({
  args: {},
  handler: async (context) => {
    const me = await userId(context);
    if (!me) return [];
    const rows = await context.db
      .query('courses')
      .withIndex('by_owner', (indexRange) => indexRange.eq('ownerId', me))
      .order('desc')
      .take(50);
    const out = [];
    for (const course of rows) {
      out.push({
        slug: course.slug,
        title: course.meta?.title ?? course.topic,
        topic: course.topic,
        kind: course.kind,
        status: course.status,
        visibility: course.visibility,
        ...(await moduleCounts(context, course._id)),
        createdAt: course._creationTime
      });
    }
    return out;
  }
});

export const events = query({
  args: { courseId: v.id('courses') },
  handler: async (context, { courseId }) => {
    const rows = await context.db
      .query('generationEvents')
      .withIndex('by_course', (indexRange) => indexRange.eq('courseId', courseId))
      .order('desc')
      .take(50);
    return rows
      .reverse()
      .map((event) => ({ id: event._id, at: event._creationTime, message: event.message, level: event.level }));
  }
});

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
  visibility: v.union(v.literal('public'), v.literal('unlisted'))
};

export const create = mutation({
  args: createArgs,
  handler: async (context, args): Promise<CreateResult> => {
    const me = await userId(context);
    if (!me) return { status: 'auth' };
    return startCourse(context, me, args);
  }
});

export const createForUser = internalMutation({
  args: { userId: v.string(), ...createArgs },
  handler: (context, { userId, ...args }) => startCourse(context, userId, args)
});

async function startCourse(
  context: MutationCtx,
  me: string,
  args: { topic: string; kind: 'concept' | 'repo'; repoUrl?: string; visibility: 'public' | 'unlisted' }
): Promise<CreateResult> {
  let topic = args.topic.trim().replace(/\s+/g, ' ');
  let repo: { owner: string; name: string } | null = null;
  if (args.kind === 'repo') {
    repo = parseRepoUrl(args.repoUrl ?? args.topic);
    if (!repo)
      return { status: 'invalid', message: 'Enter a GitHub repository URL like https://github.com/owner/name.' };
    if (topic.length < 3 || /github\.com/.test(topic)) topic = `${repo.owner}/${repo.name}`;
  }
  if (topic.length < 3 || topic.length > 200)
    return { status: 'invalid', message: 'The topic must be 3 to 200 characters.' };

  const perUser = await rateLimiter.check(context, 'generateCourse', { key: me });
  if (!perUser.ok) return { status: 'rate', retryAfterMs: perUser.retryAfter ?? 60_000 };
  const daily = await rateLimiter.check(context, 'generateCourseDaily', { key: me });
  if (!daily.ok) return { status: 'rate', retryAfterMs: daily.retryAfter ?? 3_600_000 };
  const global = await rateLimiter.check(context, 'generateCourseGlobal');
  if (!global.ok) return { status: 'rate', retryAfterMs: global.retryAfter ?? 60_000 };

  let slug = slugify(topic);
  while (
    await context.db
      .query('courses')
      .withIndex('by_slug', (indexRange) => indexRange.eq('slug', slug))
      .first()
  ) {
    slug = `${slugify(topic).slice(0, 34)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const chargeRef = `course:${slug}:${Date.now()}`;
  const charged = await context.runMutation(internal.wallet.charge, {
    userId: me,
    kind: 'generateCourse',
    ref: chargeRef
  });
  if (!chargeOk(charged)) return { status: 'credits', needed: COST.generateCourse };
  await rateLimiter.limit(context, 'generateCourse', { key: me });
  await rateLimiter.limit(context, 'generateCourseDaily', { key: me });
  await rateLimiter.limit(context, 'generateCourseGlobal');

  const courseId = await context.db.insert('courses', {
    slug,
    ownerId: me,
    topic,
    kind: args.kind,
    repo: repo ? { ...repo, sha: '' } : undefined,
    status: 'queued',
    visibility: args.visibility,
    chargeRef
  });
  await context.db.insert('generationEvents', {
    courseId,
    message: `Queued: ${topic} (${COST.generateCourse} credits)`,
    level: 'info'
  });
  await context.scheduler.runAfter(0, internal.generate.actions.plan, { courseId });
  await context.scheduler.runAfter(WATCHDOG_MS, internal.generate.state.watchdog, { courseId });
  return { status: 'ok', slug };
}

function chargeOk(chargeResult: unknown): boolean {
  if (typeof chargeResult === 'boolean') return chargeResult;
  if (chargeResult && typeof chargeResult === 'object' && 'ok' in chargeResult)
    return Boolean((chargeResult as { ok: unknown }).ok);
  return chargeResult !== null && chargeResult !== undefined;
}

export const setVisibility = mutation({
  args: { slug: v.string(), visibility: v.union(v.literal('public'), v.literal('unlisted')) },
  handler: async (context, { slug, visibility }) => {
    const me = await userId(context);
    const course = await context.db
      .query('courses')
      .withIndex('by_slug', (indexRange) => indexRange.eq('slug', slug))
      .unique();
    if (!course || !me || course.ownerId !== me) throw new Error('Not your course');
    await context.db.patch(course._id, { visibility });
  }
});

export const remove = mutation({
  args: { slug: v.string() },
  handler: async (context, { slug }) => {
    const me = await userId(context);
    const course = await context.db
      .query('courses')
      .withIndex('by_slug', (indexRange) => indexRange.eq('slug', slug))
      .unique();
    if (!course || !me || course.ownerId !== me) throw new Error('Not your course');
    for (const courseModule of await context.db
      .query('courseModules')
      .withIndex('by_course', (indexRange) => indexRange.eq('courseId', course._id))
      .collect())
      await context.db.delete(courseModule._id);
    for (const event of await context.db
      .query('generationEvents')
      .withIndex('by_course', (indexRange) => indexRange.eq('courseId', course._id))
      .collect())
      await context.db.delete(event._id);
    if (course.context) await context.storage.delete(course.context);
    await context.db.delete(course._id);
  }
});
