import { v } from 'convex/values';
import { z } from 'zod';

export const askStatus = v.union(v.literal('answering'), v.literal('answered'), v.literal('failed'));

export const askRow = v.object({
  userId: v.string(),
  courseId: v.string(),
  moduleId: v.string(),
  sectionId: v.string(),
  quote: v.string(),
  question: v.string(),
  answer: v.string(),
  conceptIds: v.array(v.string()),
  status: askStatus,
  error: v.optional(v.string()),
  updatedAt: v.number()
});

export const GradedRubric = z.object({
  points: z
    .array(
      z.object({
        isMet: z.boolean(),
        note: z.string().min(1).max(300)
      })
    )
    .min(1)
    .max(5)
});
