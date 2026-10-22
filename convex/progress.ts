import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { currentUser } from './auth';

/**
 * Course progress. Anonymous visitors are tracked per browser (deviceId);
 * once signed in, the row is linked to the user and follows them across devices.
 */
export const get = query({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const user = await currentUser(ctx);
    if (user) {
      const mine = await ctx.db.query('progress').withIndex('by_user', (q) => q.eq('userId', user._id)).first();
      if (mine) return mine;
    }
    return await ctx.db
      .query('progress')
      .withIndex('by_device', (q) => q.eq('deviceId', deviceId))
      .unique();
  },
});

export const save = mutation({
  args: {
    deviceId: v.string(),
    done: v.record(v.string(), v.boolean()),
    challenges: v.record(v.string(), v.boolean()),
  },
  handler: async (ctx, args) => {
    // Bound the payload: keys are "<courseId>:<moduleId>" across many courses.
    if (args.deviceId.length > 64) throw new Error('Invalid device id');
    if (Object.keys(args.done).length > 1000 || Object.keys(args.challenges).length > 5000) throw new Error('Too many entries');
    const user = await currentUser(ctx);
    const existing =
      (user && (await ctx.db.query('progress').withIndex('by_user', (q) => q.eq('userId', user._id)).first())) ||
      (await ctx.db.query('progress').withIndex('by_device', (q) => q.eq('deviceId', args.deviceId)).unique());
    const doc = { ...args, ...(user ? { userId: user._id } : {}), updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert('progress', doc);
  },
});
