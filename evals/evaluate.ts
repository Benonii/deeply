import { buildCheckPrompt } from './prompt';
import { parseReply } from './reply';

import type { CheckInput } from '../convex/checks/types';
import type { CaseResult, EvalTarget, Judge, PreparedCase } from './types';

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function askJudge(judge: Judge, prompt: string, caseID: string) {
  try {
    return { ok: true as const, reply: await judge.ask(prompt, caseID) };
  } catch (error) {
    return { ok: false as const, error: `the judge failed: ${describeError(error)}` };
  }
}

export async function evaluateCase(
  target: EvalTarget,
  { calibrationCase, input }: PreparedCase,
  judge: Judge
): Promise<CaseResult> {
  const base = {
    id: calibrationCase.id,
    kind: calibrationCase.kind,
    expected: calibrationCase.expected,
    reason: calibrationCase.reason
  };
  const asked = await askJudge(judge, buildCheckPrompt(target, input), calibrationCase.id);
  if (!asked.ok) return { ...base, got: 'error', problems: [], error: asked.error, reply: '' };
  const parsed = parseReply(asked.reply.text);
  const reply = { reply: asked.reply.text, costUSD: asked.reply.costUSD };
  if (!parsed.ok) return { ...base, ...reply, got: 'error', problems: [], error: parsed.error };
  const checked: CheckInput = { ...input, submission: parsed.submission };
  const outcome = await target.check.run(checked);
  const problems = outcome.problems.map((problem) => `${problem.where}: ${problem.message}`);
  return { ...base, ...reply, got: outcome.pass && problems.length === 0 ? 'pass' : 'fail', problems };
}
