import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { currentUser } from './auth';
import { hashPairingCode, PAIRING_CODE_PATTERN, PAIRING_LIFETIME_MILLISECONDS } from './lib/desktopPairing';

import type { QueryCtx } from './_generated/server';

async function findPairing(context: QueryCtx, pairingCode: string) {
  if (!PAIRING_CODE_PATTERN.test(pairingCode)) return null;
  const pairingHash = await hashPairingCode(pairingCode);
  const pairing = await context.db
    .query('desktopPairings')
    .withIndex('by_hash', (index) => index.eq('pairingHash', pairingHash))
    .unique();
  if (!pairing || pairing.expiresAt < Date.now()) return null;
  return pairing;
}

export const approve = mutation({
  args: { pairingCode: v.string(), oneTimeToken: v.string() },
  handler: async (context, { pairingCode, oneTimeToken }) => {
    if (!PAIRING_CODE_PATTERN.test(pairingCode)) throw new Error('This desktop sign-in link is not valid.');
    const user = await currentUser(context);
    if (!user) throw new Error('Sign in on the web first.');
    const pairingHash = await hashPairingCode(pairingCode);
    const existingPairing = await context.db
      .query('desktopPairings')
      .withIndex('by_hash', (index) => index.eq('pairingHash', pairingHash))
      .unique();
    if (existingPairing) throw new Error('This desktop sign-in link was already used.');
    await context.db.insert('desktopPairings', {
      pairingHash,
      oneTimeToken,
      expiresAt: Date.now() + PAIRING_LIFETIME_MILLISECONDS
    });
  }
});

export const status = query({
  args: { pairingCode: v.string() },
  handler: async (context, { pairingCode }) => ({ isApproved: (await findPairing(context, pairingCode)) !== null })
});

export const claim = mutation({
  args: { pairingCode: v.string() },
  handler: async (context, { pairingCode }) => {
    const pairing = await findPairing(context, pairingCode);
    if (!pairing) return null;
    await context.db.delete(pairing._id);
    return pairing.oneTimeToken;
  }
});

export const pruneExpired = internalMutation({
  args: {},
  handler: async (context) => {
    const expiredPairings = await context.db
      .query('desktopPairings')
      .withIndex('by_expiry', (index) => index.lt('expiresAt', Date.now()))
      .take(200);
    await Promise.all(expiredPairings.map((pairing) => context.db.delete(pairing._id)));
  }
});
