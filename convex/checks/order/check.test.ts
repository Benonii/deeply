import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../../lib/fixtures/pythonGeneratorsMap';
import { orderCheck } from './check';
import { orderExamples } from './examples';
import type { ModulePack } from '../../lib/courseSchema';

const check = (pack: ModulePack) => orderCheck.run({ pack, map: pythonGeneratorsMap });

describe('check 4, order', () => {
  it('passes a module that only names concepts taught by then', async () => {
    const result = await check(orderExamples.passing);
    assert.equal(result.pass, true);
    assert.deepEqual(result.problems, []);
  });

  it('fails a module that names a concept a later module teaches', async () => {
    const result = await check(orderExamples.failingEarlyConcept);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /uses "lazy evaluation", which module writing-generators teaches later/);
    assert.match(result.fixNote, /cut the mention, or move lazy-evaluation into an earlier module/);
  });

  it('fails a glossary term that points at a later module', async () => {
    const result = await check(orderExamples.failingForwardTerm);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /glossary term yield points at module writing-generators/);
  });

  it('fails a module the concept map never planned', async () => {
    const result = await check({ ...orderExamples.passing, id: 'not-in-the-map' });
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /not in the concept map/);
  });
});
