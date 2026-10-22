import { generateText } from 'ai';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, internalQuery } from './_generated/server';
import { currentUser } from './auth';
import { selectModel } from './lib/model';
import { rateLimiter } from './rateLimits';

export type SimplifyResult =
  | { status: 'ok'; text: string; cached: boolean; credits?: number }
  | { status: 'auth' }
  | { status: 'credits' }
  | { status: 'rate'; retryAfterMs: number }
  | { status: 'error'; message: string };

const level = v.union(v.literal(1), v.literal(2), v.literal(3));

const LEVELS: Record<1 | 2 | 3, string> = {
  1: 'Level 1 (simpler): the reader is technical but new to this topic. Keep the technical terms that matter, but explain each one the first time it appears. Remove filler and nested clauses.',
  2: 'Level 2 (plain English): the reader is a smart non-specialist. Replace jargon with everyday words wherever possible; when a term must stay, define it in a few words right where it appears.',
  3: "Level 3 (like I'm new): the reader has no background. Use everyday words and very short sentences. You may use one everyday analogy if it makes the idea click, and say plainly where the analogy stops being accurate."
};

const SYSTEM = `You rewrite one passage from a technical course so it is easier to understand.

Rules:
- Keep every technical fact correct. Do not add claims the passage does not make, and do not drop a fact the reader needs.
- Keep code identifiers, function names and API names exactly as written, inside backticks.
- Use short sentences and define jargon inline the first time it appears.
- Output only the rewritten passage as plain text with this markdown subset: **bold**, *italic*, \`code\`. Use "- " bullet lines only if the original was a list. No headings, no preamble, no closing remarks.
- Aim for the same length as the original or shorter.
- If the passage is a quiz question with options, rewrite the question and each option in the same order, keeping the same option letters.`;

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

async function sha256(text: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const getCached = internalQuery({
  args: { key: v.string() },
  handler: async (context, { key }) => {
    const row = await context.db
      .query('simplifications')
      .withIndex('by_key', (indexRange) => indexRange.eq('key', key))
      .first();
    return row?.text ?? null;
  }
});

export const store = internalMutation({
  args: { key: v.string(), level, text: v.string(), sourceChars: v.number() },
  handler: async (context, args) => {
    const existing = await context.db
      .query('simplifications')
      .withIndex('by_key', (indexRange) => indexRange.eq('key', args.key))
      .first();
    if (!existing) await context.db.insert('simplifications', args);
  }
});

export const simplify = action({
  args: { text: v.string(), level, context: v.string() },
  handler: async (actionContext, { text, level, context }): Promise<SimplifyResult> => {
    const source = normalize(text);
    if (source.length < 1 || source.length > 6000)
      return { status: 'error', message: 'This block is too long to simplify.' };
    if (context.length > 300) return { status: 'error', message: 'Context is too long.' };

    const key = await sha256(`${level}\n${source}`);
    const cached = await actionContext.runQuery(internal.simplify.getCached, { key });
    if (cached !== null) return { status: 'ok', text: cached, cached: true };

    const user = await currentUser(actionContext);
    if (!user) return { status: 'auth' };

    const mine = await rateLimiter.limit(actionContext, 'simplify', { key: user._id });
    if (!mine.ok) return { status: 'rate', retryAfterMs: mine.retryAfter };
    const global = await rateLimiter.limit(actionContext, 'simplifyGlobal');
    if (!global.ok) return { status: 'rate', retryAfterMs: global.retryAfter };

    const ref = `simplify:${key.slice(0, 16)}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const charged = await actionContext.runMutation(internal.wallet.charge, {
      userId: user._id,
      kind: 'simplify',
      ref
    });
    if (!charged.ok) return { status: 'credits' };

    try {
      const out = await rewritePassage(source, level, context);
      await actionContext.runMutation(internal.simplify.store, { key, level, text: out, sourceChars: source.length });
      return { status: 'ok', text: out, cached: false, credits: charged.credits };
    } catch (error) {
      await actionContext.runMutation(internal.wallet.refund, { userId: user._id, kind: 'simplify', ref });
      console.error('simplify failed', error);
      const message =
        error instanceof RefusalError ? error.message : 'Simplify is unavailable right now. Your credit was refunded.';
      return { status: 'error', message };
    }
  }
});

class RefusalError extends Error {}

async function rewritePassage(source: string, level: 1 | 2 | 3, context: string): Promise<string> {
  const { model, providerOptions } = selectModel('low');
  const result = await generateText({
    model,
    maxOutputTokens: 4000,
    providerOptions,
    system: SYSTEM,
    prompt: `${LEVELS[level]}\n\nWhere this passage appears: ${context || 'a technical course'}\n\n<passage>\n${source}\n</passage>`
  });

  if (result.finishReason === 'content-filter') {
    throw new RefusalError("This passage couldn't be simplified. Your credit was refunded.");
  }
  const text = result.text.trim();
  if (!text) throw new Error('Empty response');
  return text;
}
