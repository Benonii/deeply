import { streamText } from 'ai';
import { v } from 'convex/values';

import { internal } from '../_generated/api';
import { action, internalQuery } from '../_generated/server';
import { currentUser } from '../auth';
import { findActivity } from '../mastery';
import { rateLimiter } from '../rateLimits';
import { readCourseSource, resolveExplainBack } from './courseSource';
import { selectGradeModel } from './model';
import { buildGradePrompt, GRADE_SYSTEM } from './prompts';
import { readRubricResult } from './rubric';

import type { GradeResult, GradeSubject } from './types';

const MAXIMUM_GRADE_TOKENS = 900;

export const readSubject = internalQuery({
  args: { courseId: v.string(), subjectId: v.string(), deviceId: v.string(), userId: v.string() },
  handler: async (context, { courseId, subjectId, deviceId, userId }): Promise<GradeSubject | null> => {
    const source = await readCourseSource(context, courseId);
    const block = source ? resolveExplainBack(source, subjectId) : null;
    if (!block) return null;
    const activity = await findActivity(context, { deviceId, userId }, courseId, subjectId);
    if (activity?.detail.kind !== 'explainBack') return null;
    return { block, answer: activity.detail.text, isGraded: activity.detail.status === 'graded' };
  }
});

export const grade = action({
  args: { courseId: v.string(), subjectId: v.string(), deviceId: v.string() },
  handler: async (actionContext, { courseId, subjectId, deviceId }): Promise<GradeResult> => {
    const user = await currentUser(actionContext);
    if (!user) return { status: 'auth' };

    const subject = await actionContext.runQuery(internal.player.explainBack.readSubject, {
      courseId,
      subjectId,
      deviceId,
      userId: user._id
    });
    if (!subject) return { status: 'unsupported' };
    if (subject.isGraded) return { status: 'alreadyGraded' };

    const mine = await rateLimiter.limit(actionContext, 'explainBackDaily', { key: user._id });
    if (!mine.ok) return { status: 'rate', retryAfterMs: mine.retryAfter };
    const everyone = await rateLimiter.limit(actionContext, 'explainBackGlobal');
    if (!everyone.ok) {
      await rateLimiter.credit(actionContext, 'explainBackDaily', { key: user._id, count: 1 });
      return { status: 'rate', retryAfterMs: everyone.retryAfter };
    }

    try {
      const { model, providerOptions } = selectGradeModel();
      const result = streamText({
        model,
        system: GRADE_SYSTEM,
        prompt: buildGradePrompt(subject.block, subject.answer),
        maxOutputTokens: MAXIMUM_GRADE_TOKENS,
        maxRetries: 2,
        providerOptions
      });
      const reading = readRubricResult(await result.text, subject.block.rubric);
      if (reading.status === 'unreadable') throw new Error(`unreadable grade: ${reading.reason}`);
      const saved = await actionContext.runMutation(internal.mastery.saveExplainBackGrade, {
        courseId,
        subjectId,
        conceptId: subject.block.conceptId,
        deviceId,
        userId: user._id,
        points: reading.points,
        isPass: reading.isPass
      });
      if (saved.status === 'notFound') return { status: 'unsupported' };
      if (saved.status === 'alreadyGraded') return { status: 'alreadyGraded' };
      return { status: 'graded', isPass: reading.isPass };
    } catch (error) {
      console.error('explain-back grading failed', error instanceof Error ? error.message : String(error));
      await rateLimiter.credit(actionContext, 'explainBackDaily', { key: user._id, count: 1 });
      return { status: 'error', message: "Couldn't mark that just now. Try again." };
    }
  }
});
