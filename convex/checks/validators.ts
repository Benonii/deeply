import { v } from 'convex/values';
import { z } from 'zod';

import { ConceptMap } from '../lib/conceptMapSchema';
import { Challenge, GlossaryTerm, ModulePack } from '../lib/courseSchema';
import { CheckSubmission } from './submissionSchema';

export const checkMode = v.union(v.literal('on'), v.literal('off'), v.literal('shadow'));

export const CheckStageName = z.enum(['code', 'network', 'agent']);

export const CheckRequest = z.object({
  pack: ModulePack,
  map: ConceptMap,
  challenges: z.array(Challenge).optional(),
  termsTaughtEarlier: z.array(GlossaryTerm).optional(),
  submission: CheckSubmission.optional(),
  stages: z.array(CheckStageName).optional(),
  attempt: z.number().int().min(1).default(1)
});
export type CheckRequest = z.infer<typeof CheckRequest>;
