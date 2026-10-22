import { z } from 'zod';
import { Brand, Challenge, ModulePack } from '../lib/courseSchema';

export const ModuleOutline = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  kicker: z.string(),
  summary: z.string(),
  minutes: z.number(),
  plan: z.string(),
  files: z.array(z.string()).default([])
});
export type ModuleOutline = z.infer<typeof ModuleOutline>;

export const PlanOutput = z.object({
  meta: z.object({ title: z.string(), tagline: z.string(), summary: z.string() }),
  brand: Brand,
  modules: z.array(ModuleOutline).min(2).max(9)
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
  notes: z.array(z.object({ line: z.number(), text: z.string() })).optional()
});

export const ModuleOutput = ModulePack.extend({ codeRefs: z.array(RefRequest).default([]) });
export type ModuleOutput = z.infer<typeof ModuleOutput>;

export const ChallengesOutput = z.object({ challenges: z.array(Challenge).min(4).max(40) });

const HEX = /^#[0-9a-fA-F]{6}$/;
export function lintPlan(plan: PlanOutput): string[] {
  const errs: string[] = [];
  for (const [colorName, colorValue] of Object.entries(plan.brand.colors))
    if (!HEX.test(colorValue)) errs.push(`brand.colors.${colorName} must be #rrggbb, got ${colorValue}`);
  const ids = new Set<string>();
  for (const courseModule of plan.modules) {
    if (ids.has(courseModule.id)) errs.push(`duplicate module id ${courseModule.id}`);
    ids.add(courseModule.id);
  }
  return errs;
}
