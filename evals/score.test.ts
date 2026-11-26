import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listDisagreements, scoreResults } from './score';

import type { CaseKind, CaseResult, Outcome, Verdict } from './types';

const result = (id: string, expected: Verdict, got: Outcome, kind: CaseKind = 'clear'): CaseResult => ({
  id,
  kind,
  expected,
  got,
  reason: 'hand label',
  problems: [],
  reply: ''
});

describe('scoring a calibration run', () => {
  it('counts every cell of the confusion table', () => {
    const score = scoreResults([
      result('caught', 'fail', 'fail'),
      result('missed', 'fail', 'pass'),
      result('flagged', 'pass', 'fail'),
      result('kept', 'pass', 'pass'),
      result('kept-too', 'pass', 'pass'),
      result('fail-error', 'fail', 'error'),
      result('pass-error', 'pass', 'error')
    ]);
    assert.deepEqual(score.confusion, {
      failCaught: 1,
      failMissed: 1,
      passFlagged: 1,
      passKept: 2,
      failErrored: 1,
      passErrored: 1
    });
    assert.equal(score.total, 7);
    assert.equal(score.correct, 3);
    assert.equal(score.errors, 2);
  });

  it('measures precision and recall on the fail class, with errors counted as missed fails', () => {
    const score = scoreResults([
      result('a', 'fail', 'fail'),
      result('b', 'fail', 'fail'),
      result('c', 'fail', 'fail'),
      result('d', 'fail', 'error'),
      result('e', 'pass', 'fail'),
      result('f', 'pass', 'pass')
    ]);
    assert.equal(score.failPrecision, 3 / 4);
    assert.equal(score.failRecall, 3 / 4);
    assert.equal(score.accuracy, 4 / 6);
  });

  it('reports precision as unknown when nothing was failed', () => {
    const score = scoreResults([result('a', 'pass', 'pass'), result('b', 'fail', 'pass')]);
    assert.equal(score.failPrecision, null);
    assert.equal(score.failRecall, 0);
  });

  it('reports recall as unknown when no case is labelled fail', () => {
    const score = scoreResults([result('a', 'pass', 'pass')]);
    assert.equal(score.failRecall, null);
    assert.equal(score.accuracy, 1);
  });

  it('splits agreement between clear and borderline cases', () => {
    const score = scoreResults([
      result('a', 'pass', 'pass', 'clear'),
      result('b', 'fail', 'pass', 'clear'),
      result('c', 'fail', 'fail', 'borderline')
    ]);
    assert.deepEqual(score.accuracyByKind, {
      clear: { total: 2, correct: 1 },
      borderline: { total: 1, correct: 1 }
    });
  });

  it('scores an empty run as zero accuracy instead of dividing by zero', () => {
    assert.equal(scoreResults([]).accuracy, 0);
  });

  it('lists only the cases where the check and the label disagree', () => {
    const disagreements = listDisagreements([
      result('agree', 'pass', 'pass'),
      result('wrong', 'pass', 'fail'),
      result('broken', 'fail', 'error')
    ]);
    assert.deepEqual(
      disagreements.map((disagreement) => disagreement.id),
      ['wrong', 'broken']
    );
  });
});
