import { v } from 'convex/values';
import { internalMutation, mutation, query, type MutationCtx } from './_generated/server';
import { currentUser } from './auth';
import { COST, FREE_CREDITS_ON_SIGNUP } from './lib/pricing';
import { rateLimiter } from './rateLimits';

const usageKind = v.union(v.literal('simplify'), v.literal('generateCourse'));

async function getWallet(ctx: MutationCtx, userId: string) {
  return await ctx.db.query('wallets').withIndex('by_user', (q) => q.eq('userId', userId)).unique();
}

/** Creates the wallet (with the signup grant) the first time a user is seen. */
async function ensureWallet(ctx: MutationCtx, userId: string) {
  const existing = await getWallet(ctx, userId);
  if (existing) return existing;
  await rateLimiter.limit(ctx, 'walletCreateGlobal', { throws: true });
  const id = await ctx.db.insert('wallets', { userId, credits: FREE_CREDITS_ON_SIGNUP, lifetimePurchased: 0 });
  await ctx.db.insert('ledger', { userId, delta: FREE_CREDITS_ON_SIGNUP, reason: 'signup' });
  return (await ctx.db.get(id))!;
}

/** The signed-in user and their balance, or null when signed out. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const wallet = await ctx.db.query('wallets').withIndex('by_user', (q) => q.eq('userId', user._id)).unique();
    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      // Before the wallet exists we show the grant the user is about to receive.
      credits: wallet ? wallet.credits : FREE_CREDITS_ON_SIGNUP,
      costs: COST,
    };
  },
});

/** Called by the client right after sign-in so the signup grant appears in the ledger. */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const w = await ensureWallet(ctx, user._id);
    return w.credits;
  },
});

/** Recent ledger entries for the account page. */
export const history = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query('ledger')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(50);
    return rows.map((r) => ({ id: r._id, at: r._creationTime, delta: r.delta, reason: r.reason }));
  },
});

/**
 * Atomically spend credits. A mutation is a serializable transaction, so two
 * concurrent charges can never both spend the same last credit.
 */
export const charge = internalMutation({
  args: { userId: v.string(), kind: usageKind, ref: v.string() },
  handler: async (ctx, { userId, kind, ref }) => {
    const wallet = await ensureWallet(ctx, userId);
    const cost = COST[kind];
    if (wallet.credits < cost) return { ok: false as const, credits: wallet.credits };
    await ctx.db.patch(wallet._id, { credits: wallet.credits - cost });
    await ctx.db.insert('ledger', { userId, delta: -cost, reason: kind, ref });
    return { ok: true as const, credits: wallet.credits - cost };
  },
});

/** Give back a charge whose work failed. Idempotent per charge ref. */
export const refund = internalMutation({
  args: { userId: v.string(), kind: usageKind, ref: v.string() },
  handler: async (ctx, { userId, kind, ref }) => {
    const refundRef = `refund:${ref}`;
    const already = await ctx.db.query('ledger').withIndex('by_ref', (q) => q.eq('ref', refundRef)).first();
    if (already) return;
    const charged = await ctx.db.query('ledger').withIndex('by_ref', (q) => q.eq('ref', ref)).first();
    if (!charged || charged.userId !== userId || charged.delta >= 0) return;
    const wallet = await ensureWallet(ctx, userId);
    await ctx.db.patch(wallet._id, { credits: wallet.credits - charged.delta });
    await ctx.db.insert('ledger', { userId, delta: -charged.delta, reason: 'refund', ref: refundRef });
    void kind;
  },
});

/** Add purchased credits. Idempotent per Polar order id. */
export const credit = internalMutation({
  args: { userId: v.string(), credits: v.number(), ref: v.string() },
  handler: async (ctx, { userId, credits, ref }) => {
    const already = await ctx.db.query('ledger').withIndex('by_ref', (q) => q.eq('ref', ref)).first();
    if (already) return { applied: false };
    const wallet = await ensureWallet(ctx, userId);
    await ctx.db.patch(wallet._id, { credits: wallet.credits + credits, lifetimePurchased: wallet.lifetimePurchased + credits });
    await ctx.db.insert('ledger', { userId, delta: credits, reason: 'purchase', ref });
    return { applied: true };
  },
});
