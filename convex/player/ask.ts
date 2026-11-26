import { streamText } from 'ai';
import { v } from 'convex/values';

import { internal } from '../_generated/api';
import { action, internalQuery } from '../_generated/server';
import { currentUser } from '../auth';
import { rateLimiter } from '../rateLimits';
import { buildAskContext } from './askContext';
import { readCourseSource } from './courseSource';
import { selectAskModel } from './model';
import { ASK_SYSTEM } from './prompts';

import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import type { AskContext, AskResult } from './types';

const MINIMUM_QUESTION_LENGTH = 3;
const MAXIMUM_QUESTION_LENGTH = 500;
const MAXIMUM_QUOTE_LENGTH = 1200;
const MAXIMUM_ANSWER_TOKENS = 700;
const FLUSH_MILLISECONDS = 220;

export const readContext = internalQuery({
  args: {
    courseId: v.string(),
    moduleId: v.string(),
    sectionId: v.string(),
    quote: v.string(),
    question: v.string()
  },
  handler: async (context, args): Promise<AskContext | null> => {
    const source = await readCourseSource(context, args.courseId);
    if (!source) return null;
    return buildAskContext({ source, ...args });
  }
});

class AskError extends Error {}

async function streamAnswer(actionContext: ActionCtx, askId: Id<'asks'>, prompt: string): Promise<string> {
  const { model, providerOptions } = selectAskModel();
  const result = streamText({
    model,
    system: ASK_SYSTEM,
    prompt,
    maxOutputTokens: MAXIMUM_ANSWER_TOKENS,
    maxRetries: 2,
    providerOptions
  });
  let answer = '';
  let flushedAt = 0;
  for await (const delta of result.textStream) {
    answer += delta;
    if (Date.now() - flushedAt < FLUSH_MILLISECONDS) continue;
    flushedAt = Date.now();
    await actionContext.runMutation(internal.player.asks.update, { askId, answer, status: 'answering' });
  }
  if ((await result.finishReason) === 'content-filter')
    throw new AskError('The model would not answer that. Try asking it another way.');
  const finished = answer.trim();
  if (finished.length === 0) throw new AskError('The model returned nothing. Ask again.');
  return finished;
}

export const submit = action({
  args: {
    courseId: v.string(),
    moduleId: v.string(),
    sectionId: v.string(),
    quote: v.string(),
    question: v.string()
  },
  handler: async (actionContext, args): Promise<AskResult> => {
    const question = args.question.trim();
    const quote = args.quote.trim();
    if (question.length < MINIMUM_QUESTION_LENGTH) return { status: 'invalid', message: 'Ask a longer question.' };
    if (question.length > MAXIMUM_QUESTION_LENGTH || quote.length > MAXIMUM_QUOTE_LENGTH)
      return { status: 'invalid', message: 'That is longer than Ask can take. Select less, or ask it shorter.' };
    if (quote.length === 0) return { status: 'invalid', message: 'Select the passage you are asking about.' };

    const user = await currentUser(actionContext);
    if (!user) return { status: 'auth' };

    const giveTheAskBack = () => rateLimiter.credit(actionContext, 'askDaily', { key: user._id, count: 1 });
    const mine = await rateLimiter.limit(actionContext, 'askDaily', { key: user._id });
    if (!mine.ok) return { status: 'rate', retryAfterMs: mine.retryAfter };
    const everyone = await rateLimiter.limit(actionContext, 'askGlobal');
    if (!everyone.ok) {
      await giveTheAskBack();
      return { status: 'rate', retryAfterMs: everyone.retryAfter };
    }

    const context = await actionContext.runQuery(internal.player.ask.readContext, { ...args, question, quote });
    if (!context) {
      await giveTheAskBack();
      return { status: 'unsupported' };
    }

    const askId = await actionContext.runMutation(internal.player.asks.start, {
      userId: user._id,
      courseId: args.courseId,
      moduleId: args.moduleId,
      sectionId: args.sectionId,
      quote,
      question,
      conceptIds: context.conceptIds
    });

    try {
      const answer = await streamAnswer(actionContext, askId, context.prompt);
      await actionContext.runMutation(internal.player.asks.update, { askId, answer, status: 'answered' });
      return { status: 'ok', askId };
    } catch (error) {
      console.error('ask failed', error instanceof Error ? error.message : String(error));
      const message = error instanceof AskError ? error.message : "Couldn't answer that just now. Ask again.";
      await actionContext.runMutation(internal.player.asks.update, {
        askId,
        answer: '',
        status: 'failed',
        error: message
      });
      await giveTheAskBack();
      return { status: 'error', message };
    }
  }
});
