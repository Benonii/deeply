import { numberProblems } from './engineText';

import type { CheckResult, ModuleVerdict } from '../checks/types';

const CHECK_ID_COLUMN = 18;

export function describeResults(results: CheckResult[]): string[] {
  return results.map((result) => {
    const verdict = result.pass ? 'pass' : 'FAIL';
    const shadow = result.mode === 'shadow' ? ', shadow so it cannot block' : '';
    const label = result.pass ? 'note' : 'problem';
    const count =
      result.problems.length > 0
        ? `, ${result.problems.length} ${label}${result.problems.length === 1 ? '' : 's'}`
        : '';
    return `  ${result.checkId.padEnd(CHECK_ID_COLUMN)} ${verdict}${count}${shadow}`;
  });
}

export function listProblems(results: CheckResult[]): string[] {
  return results.flatMap((result) =>
    result.problems.map((problem) => `${result.checkId} at ${problem.where}: ${problem.message}`)
  );
}

export function describeVerdict(verdict: ModuleVerdict, moduleId: string, attempt: number): string[] {
  if (verdict.kind === 'pass') return [`Module ${moduleId} passed every blocking check on attempt ${attempt}.`];
  const notes = ['Fix notes:', numberProblems(verdict.fixNotes)];
  if (verdict.kind === 'retry')
    return [
      `Module ${moduleId} failed on attempt ${attempt}. Nothing was stored.`,
      '',
      ...notes,
      '',
      'Rewrite only what these notes name, then call submit_module again with the fixed pack and a fresh submission.'
    ];
  return [
    `Module ${moduleId} still failed on attempt ${attempt}, so it is stored and marked unverified.`,
    '',
    ...notes,
    '',
    'The course can publish with it. Send a fixed pack whenever you have one and the mark comes off.'
  ];
}
