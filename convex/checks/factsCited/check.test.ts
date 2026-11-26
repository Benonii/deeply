import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../../lib/fixtures/pythonGeneratorsMap';
import { factsCitedCheck } from './check';
import { factsCitedExamples } from './examples';
import type { FactualSentence } from '../submissionSchema';
import type { ModulePack } from '../../lib/courseSchema';

const check = (pack: ModulePack, factualSentences?: FactualSentence[]) =>
  factsCitedCheck.run({ pack, map: pythonGeneratorsMap, submission: { factualSentences } });

describe('check 3, facts cited', () => {
  it('passes when every mark resolves and every flagged fact is supported', async () => {
    const result = await check(factsCitedExamples.citedPack, factsCitedExamples.passing);
    assert.equal(result.pass, true);
    assert.deepEqual(result.problems, []);
  });

  it('fails a mark that is not a source in the concept map', async () => {
    const result = await check(factsCitedExamples.unknownSourcePack, factsCitedExamples.passing);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /\[\^py-tutorial\] is not a source in the concept map/);
  });

  it('fails a factual sentence that carries no citation', async () => {
    const result = await check(factsCitedExamples.uncitedPack, factsCitedExamples.failingUncited);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /states a fact with no \[\^source\] mark/);
  });

  it('fails when the agent says the source does not support the claim', async () => {
    const result = await check(factsCitedExamples.citedPack, factsCitedExamples.failingUnsupported);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /the cited claim is unsupported/);
    assert.match(result.fixNote, /returning members one at a time/);
  });

  it('fails a flagged sentence that is not in the lesson', async () => {
    const result = await check(factsCitedExamples.citedPack, factsCitedExamples.failingNotInLesson);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /not in the lesson text/);
  });

  it('fails an empty list with a note that says to read it again', async () => {
    const result = await check(factsCitedExamples.citedPack, []);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /only 0 sentences of this module were flagged as factual/);
  });

  it('fails when nothing was flagged', async () => {
    const result = await check(factsCitedExamples.citedPack, undefined);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /flag every factual sentence/);
  });
});
