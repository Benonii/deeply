import { SUBMISSION_SCHEMA } from '../convex/mcp/moduleBrief';

import type { CheckInput } from '../convex/checks/types';
import type { EvalTarget } from './types';

export function formatJSONBlock(value: unknown): string {
  return ['```json', JSON.stringify(value, null, 2), '```'].join('\n');
}

export function buildCheckPrompt(target: EvalTarget, input: CheckInput): string {
  const { check } = target;
  if (check.prompt === undefined) throw new Error(`${check.checkId} has no prompt, so it is not an LLM check`);
  return [
    `You are running one Deeply check, ${check.checkId} version ${check.version}, on one lesson module. Answer this check only.`,
    '',
    check.prompt,
    '',
    ...target.describeMaterial(input),
    '',
    '## How to reply',
    'Reply with the submission JSON object only, no prose before or after it. It must match this JSON Schema, and only the field this check asks for is needed:',
    '',
    SUBMISSION_SCHEMA
  ].join('\n');
}
