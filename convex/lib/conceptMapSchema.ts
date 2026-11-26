import { z } from 'zod';

export const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ConceptID = z.string().regex(KEBAB_ID);
export const ConceptRole = z.enum(['core', 'supporting', 'assumed']);

export const BANNED_OBJECTIVE_VERBS = [
  'understand',
  'know',
  'learn',
  'appreciate',
  'be',
  'grasp',
  'comprehend',
  'familiarize'
];

export const Objective = z.object({
  verb: z.string().min(1).describe('one action verb, e.g. "trace"'),
  object: z.string().min(1).describe('what the learner acts on'),
  context: z.string().min(1).describe('the situation the learner does it in')
});
export type Objective = z.infer<typeof Objective>;

export const SourceClaim = z.object({
  quote: z.string().min(1).describe('verbatim from the source'),
  url: z.url().describe('page or anchor the quote came from'),
  conceptId: ConceptID
});
export type SourceClaim = z.infer<typeof SourceClaim>;

export const Source = z.object({
  id: z.string().regex(KEBAB_ID),
  url: z.url(),
  title: z.string().min(1),
  tier: z.number().int().min(1).max(4).describe('1 official, 2 respected, 3 forums, 4 dropped'),
  claims: z.array(SourceClaim)
});
export type Source = z.infer<typeof Source>;

export const Concept = z.object({
  id: ConceptID,
  name: z.string().min(1).describe('short noun phrase'),
  definition: z.string().min(1).describe('one line, no newlines'),
  role: ConceptRole,
  sourceIds: z.array(z.string().regex(KEBAB_ID))
});
export type Concept = z.infer<typeof Concept>;

export const ConceptEdge = z.object({
  from: ConceptID.describe('the prerequisite'),
  to: ConceptID.describe('the concept that needs it')
});
export type ConceptEdge = z.infer<typeof ConceptEdge>;

export const ModulePlan = z.object({
  id: z.string().regex(KEBAB_ID).describe('matches ModulePack.id'),
  order: z.number().int().min(1),
  conceptIds: z.array(ConceptID).min(1).describe('new concepts this module teaches, in teaching order'),
  objective: Objective
});
export type ModulePlan = z.infer<typeof ModulePlan>;

export const CourseGoal = z.object({
  text: z.string().min(1).describe('what the learner can do at the end'),
  conceptIds: z.array(ConceptID).min(1).describe('concepts the goal needs directly')
});
export type CourseGoal = z.infer<typeof CourseGoal>;

export const ConceptMap = z.object({
  schemaVersion: z.literal(2),
  goal: CourseGoal,
  concepts: z.array(Concept).min(1),
  edges: z.array(ConceptEdge),
  modules: z.array(ModulePlan).min(1),
  sources: z.array(Source)
});
export type ConceptMap = z.infer<typeof ConceptMap>;
