import { v } from 'convex/values';

import { internalMutation, internalQuery } from '../_generated/server';
import { finderThresholds, quotaUnitsPerCall } from './weights';
import type { Doc } from '../_generated/dataModel';
import type { DatabaseReader } from '../_generated/server';
import type { QuotaSpend } from './types';

const quotaCallNames = Object.keys(quotaUnitsPerCall) as (keyof typeof quotaUnitsPerCall)[];

export function findConceptRow(database: DatabaseReader, conceptKey: string) {
  return database
    .query('conceptMedia')
    .withIndex('by_concept_key', (index) => index.eq('conceptKey', conceptKey))
    .unique();
}

export function isFresh(row: Doc<'conceptMedia'>, now: number): boolean {
  return now - row.fetchedAt < finderThresholds.cacheDays * 86_400 * 1000;
}

export const loadConcept = internalQuery({
  args: { conceptKey: v.string() },
  handler: (context, { conceptKey }) => findConceptRow(context.db, conceptKey)
});

export const saveVideoCandidates = internalMutation({
  args: {
    conceptKey: v.string(),
    topic: v.string(),
    conceptName: v.string(),
    conceptId: v.string(),
    videoCandidates: v.any(),
    quotaUnits: v.number()
  },
  handler: async (context, { conceptKey, quotaUnits, ...fields }) => {
    const existing = await findConceptRow(context.db, conceptKey);
    const fetchedAt = Date.now();
    if (existing === null)
      return context.db.insert('conceptMedia', { conceptKey, ...fields, fetchedAt, quotaUnits, videos: [] });
    await context.db.patch(existing._id, {
      ...fields,
      fetchedAt,
      quotaUnits: existing.quotaUnits + quotaUnits,
      videos: []
    });
    return existing._id;
  }
});

export const saveArticleCandidates = internalMutation({
  args: {
    conceptKey: v.string(),
    topic: v.string(),
    conceptName: v.string(),
    conceptId: v.string(),
    articleCandidates: v.any()
  },
  handler: async (context, { conceptKey, ...fields }) => {
    const existing = await findConceptRow(context.db, conceptKey);
    if (existing === null)
      return context.db.insert('conceptMedia', {
        conceptKey,
        ...fields,
        fetchedAt: Date.now(),
        quotaUnits: 0,
        articles: []
      });
    await context.db.patch(existing._id, { ...fields, articles: [] });
    return existing._id;
  }
});

export const recordQuota = internalMutation({
  args: { conceptKey: v.string(), spend: v.any() },
  handler: async (context, { conceptKey, spend }) => {
    const counted = spend as QuotaSpend;
    const day = new Date().toISOString().slice(0, 10);
    for (const call of quotaCallNames) {
      const calls = counted[call];
      if (calls === 0) continue;
      await context.db.insert('finderQuota', {
        day,
        conceptKey,
        call,
        calls,
        units: calls * quotaUnitsPerCall[call]
      });
    }
  }
});

export const readQuotaSpend = internalQuery({
  args: { day: v.optional(v.string()) },
  handler: async (context, { day }) => {
    const chosenDay = day ?? new Date().toISOString().slice(0, 10);
    const rows = await context.db
      .query('finderQuota')
      .withIndex('by_day', (index) => index.eq('day', chosenDay))
      .collect();
    const byCall = Object.fromEntries(quotaCallNames.map((call) => [call, 0]));
    let units = 0;
    for (const row of rows) {
      byCall[row.call] += row.calls;
      units += row.units;
    }
    return {
      data: { day: chosenDay, byCall, units, runs: rows.length },
      message: `${units} units spent on ${chosenDay}`
    };
  }
});
