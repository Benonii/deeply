import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { currentUser } from './auth';
import { reviewMasteryCard } from './lib/mastery';
import { conceptActivityInput, rubricPointResult } from './lib/validators';
import type { ConceptActivityDetail, ConceptActivityInput, Learner } from './lib/types';
import type { SaveGradeResult } from './player/types';

const MAXIMUM_ID_LENGTH = 64;
const MAXIMUM_SUBJECT_LENGTH = 200;
const MAXIMUM_EXPLAIN_BACK_LENGTH = 4000;
const ACTIVITY_PAGE_SIZE = 500;

async function readLearner(context: QueryCtx, deviceId: string): Promise<Learner> {
  const user = await currentUser(context);
  return { deviceId, userId: user?._id };
}

async function listMastery(context: QueryCtx, learner: Learner, courseId: string): Promise<Doc<'mastery'>[]> {
  if (learner.userId) {
    const mine = await context.db
      .query('mastery')
      .withIndex('by_user', (range) => range.eq('userId', learner.userId).eq('courseId', courseId))
      .collect();
    if (mine.length) return mine;
  }
  return await context.db
    .query('mastery')
    .withIndex('by_device', (range) => range.eq('deviceId', learner.deviceId).eq('courseId', courseId))
    .collect();
}

async function listActivity(context: QueryCtx, learner: Learner, courseId: string): Promise<Doc<'conceptActivity'>[]> {
  if (learner.userId) {
    const mine = await context.db
      .query('conceptActivity')
      .withIndex('by_user', (range) => range.eq('userId', learner.userId).eq('courseId', courseId))
      .take(ACTIVITY_PAGE_SIZE);
    if (mine.length) return mine;
  }
  return await context.db
    .query('conceptActivity')
    .withIndex('by_device', (range) => range.eq('deviceId', learner.deviceId).eq('courseId', courseId))
    .take(ACTIVITY_PAGE_SIZE);
}

export const listCourse = query({
  args: { courseId: v.string(), deviceId: v.string() },
  handler: async (context, { courseId, deviceId }) => {
    const learner = await readLearner(context, deviceId);
    return {
      concepts: await listMastery(context, learner, courseId),
      activity: await listActivity(context, learner, courseId)
    };
  }
});

function readSavedDetail(input: ConceptActivityInput): ConceptActivityDetail {
  if (input.kind === 'explainBack')
    return { kind: input.kind, text: input.text.slice(0, MAXIMUM_EXPLAIN_BACK_LENGTH), status: 'pending grading' };
  return input;
}

function shouldReplacePreviousActivity(kind: ConceptActivityInput['kind']) {
  return kind === 'articleCheckIn' || kind === 'videoWatch' || kind === 'explainBack';
}

export async function findActivity(context: QueryCtx, learner: Learner, courseId: string, subjectId: string) {
  if (learner.userId) {
    const mine = await context.db
      .query('conceptActivity')
      .withIndex('by_user', (range) =>
        range.eq('userId', learner.userId).eq('courseId', courseId).eq('subjectId', subjectId)
      )
      .first();
    if (mine) return mine;
  }
  return await context.db
    .query('conceptActivity')
    .withIndex('by_device', (range) =>
      range.eq('deviceId', learner.deviceId).eq('courseId', courseId).eq('subjectId', subjectId)
    )
    .first();
}

async function findMastery(context: QueryCtx, learner: Learner, courseId: string, conceptId: string) {
  if (learner.userId) {
    const mine = await context.db
      .query('mastery')
      .withIndex('by_user', (range) =>
        range.eq('userId', learner.userId).eq('courseId', courseId).eq('conceptId', conceptId)
      )
      .first();
    if (mine) return mine;
  }
  return await context.db
    .query('mastery')
    .withIndex('by_device', (range) =>
      range.eq('deviceId', learner.deviceId).eq('courseId', courseId).eq('conceptId', conceptId)
    )
    .first();
}

export async function updateMastery(
  context: MutationCtx,
  learner: Learner,
  keys: { courseId: string; conceptId: string },
  isCorrect: boolean,
  now: number
) {
  const existing = await findMastery(context, learner, keys.courseId, keys.conceptId);
  const card = reviewMasteryCard(existing?.card, isCorrect, new Date(now));
  const updated = {
    ...keys,
    deviceId: learner.deviceId,
    ...(learner.userId ? { userId: learner.userId } : {}),
    attempts: (existing?.attempts ?? 0) + 1,
    correct: (existing?.correct ?? 0) + (isCorrect ? 1 : 0),
    lastResult: isCorrect ? ('pass' as const) : ('fail' as const),
    card,
    updatedAt: now
  };
  if (existing) await context.db.patch(existing._id, updated);
  else await context.db.insert('mastery', updated);
}

export const record = mutation({
  args: {
    courseId: v.string(),
    moduleId: v.string(),
    conceptId: v.string(),
    deviceId: v.string(),
    subjectId: v.string(),
    detail: conceptActivityInput
  },
  handler: async (context, args) => {
    if (args.deviceId.length > MAXIMUM_ID_LENGTH || args.courseId.length > MAXIMUM_ID_LENGTH)
      throw new Error('Invalid learner or course id');
    if (args.conceptId.length > MAXIMUM_ID_LENGTH || args.subjectId.length > MAXIMUM_SUBJECT_LENGTH)
      throw new Error('Invalid concept or subject id');
    const learner = await readLearner(context, args.deviceId);
    const now = Date.now();
    const row = {
      courseId: args.courseId,
      moduleId: args.moduleId,
      conceptId: args.conceptId,
      subjectId: args.subjectId,
      deviceId: learner.deviceId,
      ...(learner.userId ? { userId: learner.userId } : {}),
      detail: readSavedDetail(args.detail),
      updatedAt: now
    };
    const previous = shouldReplacePreviousActivity(args.detail.kind)
      ? await findActivity(context, learner, args.courseId, args.subjectId)
      : null;
    if (previous) await context.db.patch(previous._id, row);
    else await context.db.insert('conceptActivity', row);
    if (args.detail.kind === 'quizAnswer')
      await updateMastery(
        context,
        learner,
        { courseId: args.courseId, conceptId: args.conceptId },
        args.detail.isCorrect,
        now
      );
  }
});

export const saveExplainBackGrade = internalMutation({
  args: {
    courseId: v.string(),
    subjectId: v.string(),
    conceptId: v.string(),
    deviceId: v.string(),
    userId: v.string(),
    points: v.array(rubricPointResult),
    isPass: v.boolean()
  },
  handler: async (context, args): Promise<SaveGradeResult> => {
    const learner: Learner = { deviceId: args.deviceId, userId: args.userId };
    const activity = await findActivity(context, learner, args.courseId, args.subjectId);
    if (!activity || activity.detail.kind !== 'explainBack') return { status: 'notFound' };
    if (activity.detail.status === 'graded') return { status: 'alreadyGraded' };
    const now = Date.now();
    await context.db.patch(activity._id, {
      detail: {
        kind: 'explainBack',
        text: activity.detail.text,
        status: 'graded',
        points: args.points,
        isPass: args.isPass,
        gradedAt: now
      },
      updatedAt: now
    });
    await updateMastery(
      context,
      { deviceId: activity.deviceId, userId: activity.userId },
      { courseId: args.courseId, conceptId: args.conceptId },
      args.isPass,
      now
    );
    return { status: 'saved' };
  }
});
