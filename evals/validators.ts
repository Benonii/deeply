import { z } from 'zod';

import { GlossaryTerm, Section } from '../convex/lib/courseSchema';
import { KEBAB_ID } from '../convex/lib/conceptMapSchema';

const BaseCase = z.object({
  id: z.string().regex(KEBAB_ID),
  expected: z.enum(['pass', 'fail']),
  kind: z.enum(['clear', 'borderline']),
  reason: z.string().min(1),
  topic: z.string().min(1)
});

export const QuizCase = BaseCase.extend({
  lesson: z.string().min(1).optional(),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  key: z.number().int().min(0)
});
export type QuizCase = z.infer<typeof QuizCase>;

export const FactsCitedCase = BaseCase.extend({
  text: z.array(z.string().min(1)).min(1),
  sources: z.array(z.object({ id: z.string().regex(KEBAB_ID), quote: z.string().min(1) }))
});
export type FactsCitedCase = z.infer<typeof FactsCitedCase>;

export const JargonCase = BaseCase.extend({
  text: z.array(z.string().min(1)).min(1),
  glossary: z.array(GlossaryTerm)
});
export type JargonCase = z.infer<typeof JargonCase>;

export const TeachingQualityCase = BaseCase.extend({
  goal: z.string().min(1),
  summary: z.string().min(1),
  sections: z.array(Section).min(1)
});
export type TeachingQualityCase = z.infer<typeof TeachingQualityCase>;

export const CalibrationFile = z.object({
  checkId: z.string().min(1),
  cases: z.array(z.unknown()).min(1)
});

export const ClaudePrintOutput = z.object({
  result: z.string(),
  is_error: z.boolean().optional(),
  total_cost_usd: z.number().optional()
});
