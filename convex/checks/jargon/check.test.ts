import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../../lib/fixtures/pythonGeneratorsMap';
import { jargonCheck } from './check';
import { jargonExamples } from './examples';
import type { ColdReaderWord } from '../submissionSchema';
import type { ModulePack } from '../../lib/courseSchema';

const check = (pack: ModulePack, coldReaderWords?: ColdReaderWord[]) =>
  jargonCheck.run({ pack, map: pythonGeneratorsMap, submission: { coldReaderWords } });

describe('check 5, jargon', () => {
  it('passes when every listed word is marked and defined', async () => {
    const result = await check(jargonExamples.pack, jargonExamples.passing);
    assert.equal(result.pass, true);
    assert.deepEqual(result.problems, []);
  });

  it('fails a listed word with no glossary entry', async () => {
    const result = await check(jargonExamples.pack, jargonExamples.failingUndefined);
    assert.equal(result.pass, false);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /"comprehension" has no glossary entry/);
    assert.match(result.fixNote, /add a glossary entry for it and mark it \[\[comprehension\]\]/);
  });

  it('fails a defined word that is never marked in the text', async () => {
    const result = await check(jargonExamples.definedButUnmarkedPack, jargonExamples.failingUnmarked);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /"cursor" is defined but never marked in the text/);
  });

  it('fails when no word list was submitted', async () => {
    const result = await check(jargonExamples.pack, undefined);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /list every word a newcomer would not know/);
  });
});
