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

  it('counts a word as covered when it is the display form of a mark that points at a glossary entry', async () => {
    const pack: ModulePack = {
      ...jargonExamples.pack,
      glossary: [
        { id: 'overfitting', term: 'overfitting', definition: 'Learning the training data too closely.' },
        { id: 'csrf-token', term: 'CSRF token', definition: 'A secret value the server puts in its own forms.' }
      ],
      sections: [
        {
          id: 'lesson',
          title: 'Lesson',
          blocks: [{ type: 'p', text: 'The model [[overfitting|overfits]]. Send a [[csrf-token]] with the form.' }]
        }
      ]
    };
    const result = await check(pack, [
      { word: 'overfits', where: 'lesson' },
      { word: 'CSRF', where: 'lesson' },
      { word: 'CSRF token', where: 'lesson' },
      { word: 'overfitting', where: 'lesson' }
    ]);
    assert.deepEqual(result.problems, []);
  });

  it('still fails a word that only shares letters with a glossary term', async () => {
    const pack: ModulePack = {
      ...jargonExamples.pack,
      glossary: [{ id: 'shard', term: 'shard', definition: 'One part of a dataset on its own server.' }],
      sections: [{ id: 'lesson', title: 'Lesson', blocks: [{ type: 'p', text: 'Each [[shard]] uses sharding keys.' }] }]
    };
    const result = await check(pack, [{ word: 'sharding', where: 'lesson' }]);
    assert.match(result.problems[0].message, /"sharding" has no glossary entry/);
  });

  it('fails when no word list was submitted', async () => {
    const result = await check(jargonExamples.pack, undefined);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /list every word a newcomer would not know/);
  });
});
