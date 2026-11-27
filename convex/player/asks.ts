import { v } from 'convex/values';

import { internalMutation, query } from '../_generated/server';
import { currentUser } from '../auth';
import { ASK_DAILY_LIMIT, rateLimiter } from '../rateLimits';
import { askStatus } from './validators';

import type { Doc } from '../_generated/dataModel';
import type { AskPanelView, AskView } from './types';

const MAXIMUM_ASKS_SHOWN = 20;

function toAskView(row: Doc<'asks'>): AskView {
  return {
    id: row._id,
    quote: row.quote,
    question: row.question,
    answer: row.answer,
    status: row.status,
    conceptIds: row.conceptIds,
    error: row.error ?? null,
    askedAt: row._creationTime
  };
}

export const listForModule = query({
  args: { courseId: v.string(), moduleId: v.string() },
  handler: async (context, { courseId, moduleId }): Promise<AskPanelView> => {
    const user = await currentUser(context);
    if (!user) return { isSignedIn: false, remainingToday: ASK_DAILY_LIMIT, dailyLimit: ASK_DAILY_LIMIT, asks: [] };
    const rows = await context.db
      .query('asks')
      .withIndex('by_user_module', (indexRange) =>
        indexRange.eq('userId', user._id).eq('courseId', courseId).eq('moduleId', moduleId)
      )
      .order('desc')
      .take(MAXIMUM_ASKS_SHOWN);
    const limit = await rateLimiter.getValue(context, 'askDaily', { key: user._id });
    return {
      isSignedIn: true,
      remainingToday: Math.max(0, Math.floor(limit.value)),
      dailyLimit: limit.config.rate,
      asks: rows.map(toAskView)
    };
  }
});

export const start = internalMutation({
  args: {
    userId: v.string(),
    courseId: v.string(),
    moduleId: v.string(),
    sectionId: v.string(),
    quote: v.string(),
    question: v.string(),
    conceptIds: v.array(v.string())
  },
  handler: async (context, args) => {
    return await context.db.insert('asks', { ...args, answer: '', status: 'answering', updatedAt: Date.now() });
  }
});

export const update = internalMutation({
  args: { askId: v.id('asks'), answer: v.string(), status: askStatus, error: v.optional(v.string()) },
  handler: async (context, { askId, answer, status, error }) => {
    await context.db.patch(askId, { answer, status, error, updatedAt: Date.now() });
  }
});
