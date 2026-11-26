import { extractJson } from '../generate/llm';
import { GradedRubric } from './validators';

import type { RubricPointResult } from './types';

const PASS_NUMERATOR = 2;
const PASS_DENOMINATOR = 3;

export function countPointsNeededToPass(rubricLength: number): number {
  return Math.ceil((rubricLength * PASS_NUMERATOR) / PASS_DENOMINATOR);
}

export type RubricReading =
  | { status: 'read'; points: RubricPointResult[]; isPass: boolean }
  | { status: 'unreadable'; reason: string };

export function readRubricResult(text: string, rubric: string[]): RubricReading {
  let parsed: ReturnType<typeof GradedRubric.safeParse>;
  try {
    parsed = GradedRubric.safeParse(extractJson(text));
  } catch (error) {
    return { status: 'unreadable', reason: error instanceof Error ? error.message : String(error) };
  }
  if (!parsed.success)
    return { status: 'unreadable', reason: parsed.error.issues.map((issue) => issue.message).join('; ') };
  const { points } = parsed.data;
  if (points.length !== rubric.length)
    return { status: 'unreadable', reason: `marked ${points.length} points for a rubric of ${rubric.length}` };
  const met = points.filter((point) => point.isMet).length;
  return { status: 'read', points, isPass: met >= countPointsNeededToPass(rubric.length) };
}
