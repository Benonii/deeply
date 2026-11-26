import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../../lib/fixtures/pythonGeneratorsMap';
import { teachingQualityCheck } from './check';
import { teachingQualityExamples } from './examples';
import type { TeachingScores } from '../submissionSchema';

const check = (teachingScores?: TeachingScores) =>
  teachingQualityCheck.run({
    pack: teachingQualityExamples.pack,
    map: pythonGeneratorsMap,
    submission: { teachingScores }
  });

describe('check 9, teaching quality', () => {
  it('reports nothing when every criterion scores 3 or more', async () => {
    const result = await check(teachingQualityExamples.passing);
    assert.equal(result.pass, true);
    assert.deepEqual(result.problems, []);
  });

  it('flags a criterion below 3 without blocking the module', async () => {
    const result = await check(teachingQualityExamples.flagging);
    assert.equal(result.pass, true);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /mistake addressed scores 2 of 5/);
    assert.match(result.fixNote, /name the mistake learners make here/);
    assert.match(result.fixNote, /judge's note: nothing names the mistake/);
  });

  it('says so when teaching quality was never judged', async () => {
    const result = await check(undefined);
    assert.equal(result.pass, true);
    assert.match(result.problems[0].message, /teaching quality was not judged/);
  });
});
