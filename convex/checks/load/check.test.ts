import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../../lib/fixtures/pythonGeneratorsMap';
import { loadCheck } from './check';
import { loadExamples } from './examples';
import { loadThresholds } from './thresholds';
import type { ModulePack } from '../../lib/courseSchema';

const check = (pack: ModulePack) => loadCheck.run({ pack, map: pythonGeneratorsMap });

describe('check 6, load', () => {
  it('passes a module of two concepts and short sections', async () => {
    const result = await check(loadExamples.passing);
    assert.equal(result.pass, true);
    assert.deepEqual(result.problems, []);
  });

  it('fails a module that teaches four new concepts', async () => {
    const result = await check(loadExamples.failingTooManyConcepts);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /teaches 4 new concepts, at most 3 allowed/);
    assert.match(result.fixNote, /move the rest to their own module/);
  });

  it('fails a section over the word limit and names the count', async () => {
    const result = await check(loadExamples.failingTooLongSection);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, new RegExp(`the limit is ${loadThresholds.maxWordsPerSection}`));
    assert.match(result.fixNote, /split it into two sections/);
  });
});
