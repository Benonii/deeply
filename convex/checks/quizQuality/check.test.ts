import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../../lib/fixtures/pythonGeneratorsMap';
import { quizQualityCheck } from './check';
import { quizQualityExamples } from './examples';
import type { ModulePack } from '../../lib/courseSchema';
import type { QuizDistractorVerdict } from '../submissionSchema';

const check = (pack: ModulePack, quizDistractors?: QuizDistractorVerdict[]) =>
  quizQualityCheck.run({ pack, map: pythonGeneratorsMap, submission: { quizDistractors } });

describe('check 7, quiz quality', () => {
  it('passes a tagged question with four distinct options and a good verdict', async () => {
    const result = await check(quizQualityExamples.passing, quizQualityExamples.passingVerdicts);
    assert.equal(result.pass, true);
    assert.deepEqual(result.problems, []);
  });

  it('fails a repeated option', async () => {
    const result = await check(quizQualityExamples.failingDuplicateOptions, quizQualityExamples.passingVerdicts);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /option "\[\]" appears twice/);
  });

  it('fails a question with only two options', async () => {
    const result = await check(quizQualityExamples.failingTooFewOptions, quizQualityExamples.passingVerdicts);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /has 2 options, at least 3 needed/);
  });

  it('fails an untagged question', async () => {
    const untagged: ModulePack = {
      ...quizQualityExamples.passing,
      sections: quizQualityExamples.passing.sections.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) => (block.type === 'check' ? { ...block, conceptId: undefined } : block))
      }))
    };
    const result = await check(untagged, quizQualityExamples.passingVerdicts);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /tags no concept/);
  });

  it('fails when the wrong options are not real mistakes', async () => {
    const result = await check(quizQualityExamples.passing, quizQualityExamples.failingVerdicts);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /replace them with the mistakes learners actually make/);
  });

  it('fails when no distractor verdict was submitted', async () => {
    const result = await check(quizQualityExamples.passing, undefined);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /whether its wrong options are mistakes learners really make/);
  });
});
