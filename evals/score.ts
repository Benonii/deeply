import type { CaseKind, CaseResult, Confusion, Score } from './types';

const EMPTY_CONFUSION: Confusion = {
  failCaught: 0,
  failMissed: 0,
  passFlagged: 0,
  passKept: 0,
  failErrored: 0,
  passErrored: 0
};

const ratio = (numerator: number, denominator: number) => (denominator === 0 ? null : numerator / denominator);

function countConfusion(results: CaseResult[]): Confusion {
  const confusion = { ...EMPTY_CONFUSION };
  for (const result of results) {
    if (result.expected === 'fail' && result.got === 'fail') confusion.failCaught += 1;
    if (result.expected === 'fail' && result.got === 'pass') confusion.failMissed += 1;
    if (result.expected === 'fail' && result.got === 'error') confusion.failErrored += 1;
    if (result.expected === 'pass' && result.got === 'fail') confusion.passFlagged += 1;
    if (result.expected === 'pass' && result.got === 'pass') confusion.passKept += 1;
    if (result.expected === 'pass' && result.got === 'error') confusion.passErrored += 1;
  }
  return confusion;
}

function countByKind(results: CaseResult[]): Record<CaseKind, { total: number; correct: number }> {
  const counts = { clear: { total: 0, correct: 0 }, borderline: { total: 0, correct: 0 } };
  for (const result of results) {
    counts[result.kind].total += 1;
    if (isAgreement(result)) counts[result.kind].correct += 1;
  }
  return counts;
}

export function isAgreement(result: CaseResult): boolean {
  return result.got === result.expected;
}

export function scoreResults(results: CaseResult[]): Score {
  const confusion = countConfusion(results);
  const correct = confusion.failCaught + confusion.passKept;
  return {
    total: results.length,
    correct,
    errors: confusion.failErrored + confusion.passErrored,
    accuracy: ratio(correct, results.length) ?? 0,
    failPrecision: ratio(confusion.failCaught, confusion.failCaught + confusion.passFlagged),
    failRecall: ratio(confusion.failCaught, confusion.failCaught + confusion.failMissed + confusion.failErrored),
    confusion,
    accuracyByKind: countByKind(results)
  };
}

export function listDisagreements(results: CaseResult[]): CaseResult[] {
  return results.filter((result) => !isAgreement(result));
}
