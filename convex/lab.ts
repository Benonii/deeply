import { internalMutation, mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';

const ROOMS = ['general', 'random'];
const COUNTERS = ['hot'];
const room = v.union(...ROOMS.map((roomName) => v.literal(roomName)));

export const listMessages = query({
  args: { room },
  handler: async (context, { room }) => {
    return await context.db
      .query('messages')
      .withIndex('by_room', (indexRange) => indexRange.eq('room', room))
      .order('desc')
      .take(30);
  },
});

export const send = mutation({
  args: { room, author: v.string(), body: v.string() },
  handler: async (context, { room, author, body }) => {
    const text = body.trim();
    if (!text || text.length > 280) throw new ConvexError('Messages must be 1–280 characters.');
    if (author.length > 32) throw new ConvexError('Author name too long.');
    await context.db.insert('messages', { room, author, body: text });
  },
});

export const getCounter = query({
  args: { name: v.string() },
  handler: async (context, { name }) => {
    const counter = await context.db
      .query('counters')
      .withIndex('by_name', (indexRange) => indexRange.eq('name', name))
      .unique();
    return counter?.value ?? 0;
  },
});

export const increment = mutation({
  args: { name: v.string() },
  handler: async (context, { name }) => {
    if (!COUNTERS.includes(name)) throw new ConvexError('Unknown counter.');
    const counter = await context.db
      .query('counters')
      .withIndex('by_name', (indexRange) => indexRange.eq('name', name))
      .unique();
    if (counter) await context.db.patch(counter._id, { value: counter.value + 1 });
    else await context.db.insert('counters', { name, value: 1 });
  },
});

export const pruneMessages = internalMutation({
  args: {},
  handler: async (context) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const old = await context.db
      .query('messages')
      .withIndex('by_creation_time', (indexRange) => indexRange.lt('_creationTime', cutoff))
      .take(500);
    for (const message of old) await context.db.delete(message._id);
  },
});
