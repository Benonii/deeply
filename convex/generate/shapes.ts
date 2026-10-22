import { z } from 'zod';
import { Brand, Challenge, ModulePack } from '../lib/courseSchema';

/** What the planner returns. */
export const ModuleOutline = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  kicker: z.string(),
  summary: z.string(),
  minutes: z.number(),
  plan: z.string(),
  files: z.array(z.string()).default([]),
});
export type ModuleOutline = z.infer<typeof ModuleOutline>;

export const PlanOutput = z.object({
  meta: z.object({ title: z.string(), tagline: z.string(), summary: z.string() }),
  brand: Brand,
  modules: z.array(ModuleOutline).min(2).max(9),
});
export type PlanOutput = z.infer<typeof PlanOutput>;

export const RefRequest = z.object({
  id: z.string(),
  title: z.string(),
  path: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  firstLine: z.string().optional(),
  symbol: z.string(),
  summary: z.string(),
  explain: z.string(),
  notes: z.array(z.object({ line: z.number(), text: z.string() })).optional(),
});

/** What a module writer returns: the module plus pointers to code it wants to quote. */
export const ModuleOutput = ModulePack.extend({ codeRefs: z.array(RefRequest).default([]) });
export type ModuleOutput = z.infer<typeof ModuleOutput>;

export const ChallengesOutput = z.object({ challenges: z.array(Challenge).min(4).max(40) });

const HEX = /^#[0-9a-fA-F]{6}$/;
/** Extra checks on the planner output. */
export function lintPlan(p: PlanOutput): string[] {
  const errs: string[] = [];
  for (const [k, c] of Object.entries(p.brand.colors)) if (!HEX.test(c)) errs.push(`brand.colors.${k} must be #rrggbb, got ${c}`);
  const ids = new Set<string>();
  for (const m of p.modules) {
    if (ids.has(m.id)) errs.push(`duplicate module id ${m.id}`);
    ids.add(m.id);
  }
  return errs;
}
