import { listRunnableCodeBlocks, normalizeOutput } from '../moduleText';
import { codeRunsThresholds } from './thresholds';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem } from '../types';

function quote(text: string): string {
  const escaped = JSON.stringify(text);
  const limit = codeRunsThresholds.outputCharsInFixNote;
  return escaped.length <= limit ? escaped : `${escaped.slice(0, limit - 1)}…"`;
}

function compareRuns({ pack, submission }: CheckInput): CheckOutcome {
  const blocks = listRunnableCodeBlocks(pack);
  if (blocks.length === 0) return { pass: true, problems: [], fixNote: '' };
  const reports = submission?.codeRuns;
  if (reports === undefined)
    return {
      pass: false,
      problems: [{ where: pack.id, message: `${blocks.length} runnable code blocks, none reported as run` }],
      fixNote: `run the ${blocks.length} runnable code blocks and report exactly what each printed`
    };
  const problems: CheckProblem[] = [];
  const notes: string[] = [];
  const reported = new Map(reports.map((report) => [report.block, report]));
  for (const position of reported.keys())
    if (!blocks.some((block) => block.position === position))
      problems.push({ where: pack.id, message: `a run was reported for code block ${position}, which does not exist` });
  for (const block of blocks) {
    const report = reported.get(block.position);
    if (report === undefined) {
      problems.push({ where: block.where, message: `code block ${block.position} was not run` });
      notes.push(`code block ${block.position} was not run, so its output is unverified`);
      continue;
    }
    if (report.error !== undefined && report.error.trim().length > 0) {
      problems.push({ where: block.where, message: `code block ${block.position} failed: ${report.error.trim()}` });
      notes.push(`code block ${block.position} raises ${quote(report.error)} instead of running`);
      continue;
    }
    if (block.expectedOutput === undefined) {
      if (!codeRunsThresholds.requireExpectedOutput) continue;
      problems.push({ where: block.where, message: `code block ${block.position} has no expectedOutput` });
      notes.push(
        `code block ${block.position} prints ${quote(report.stdout)}, the lesson says nothing it should print`
      );
      continue;
    }
    const printed = normalizeOutput(report.stdout);
    const promised = normalizeOutput(block.expectedOutput);
    if (printed === promised) continue;
    problems.push({
      where: block.where,
      message: `code block ${block.position} prints ${quote(report.stdout)}, expectedOutput says ${quote(block.expectedOutput)}`
    });
    notes.push(
      `code block ${block.position} prints ${quote(report.stdout)}, lesson says ${quote(block.expectedOutput)}`
    );
  }
  return { pass: problems.length === 0, problems, fixNote: notes.join('; ') };
}

export const codeRunsCheck: CheckModule = {
  checkId: 'code-runs',
  version: '1.0.0',
  stage: 'agent',
  run: compareRuns
};
