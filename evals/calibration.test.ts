import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CHECK_REGISTRY } from '../convex/checks/registry';
import { ConceptMap } from '../convex/lib/conceptMapSchema';
import { ModulePack } from '../convex/lib/courseSchema';
import { findTarget, listEvalCheckIDs, loadCalibration, prepareCalibration } from './calibration';

import type { CheckSubmission } from '../convex/checks/submissionSchema';
import type { CheckID } from '../convex/checks/types';

const MIN_CASES = 45;

const SUBMISSIONS_THAT_FIND_NOTHING: Partial<Record<CheckID, (blocks: number) => CheckSubmission>> = {
  'quiz-quality': (blocks) => ({
    quizDistractors: Array.from({ length: blocks }, (_, index) => ({ block: index + 1, hasMistakeBasedOptions: true }))
  }),
  jargon: () => ({ coldReaderWords: [] }),
  'teaching-quality': () => ({
    teachingScores: { objectiveStated: 4, workedExample: 4, practice: 4, mistakeAddressed: 4, levelFits: 4 }
  })
};

describe('the calibration sets', () => {
  it('cover exactly the five LLM checks', () => {
    assert.deepEqual(listEvalCheckIDs().sort(), [
      'answer-keys',
      'facts-cited',
      'jargon',
      'quiz-quality',
      'teaching-quality'
    ]);
    const agentChecks = CHECK_REGISTRY.filter((registration) => registration.check.stage === 'agent').map(
      (registration) => registration.check.checkId
    );
    for (const checkId of listEvalCheckIDs()) assert.ok(agentChecks.includes(checkId));
  });

  for (const checkId of listEvalCheckIDs())
    describe(checkId, () => {
      it('holds about fifty labelled cases with passes, fails and borderline cases', async () => {
        const cases = await loadCalibration(findTarget(checkId));
        const count = (keep: (label: (typeof cases)[number]['calibrationCase']) => boolean) =>
          cases.filter(({ calibrationCase }) => keep(calibrationCase)).length;
        assert.ok(cases.length >= MIN_CASES, `${cases.length} cases`);
        assert.ok(count((label) => label.expected === 'fail') >= cases.length / 3);
        assert.ok(count((label) => label.expected === 'pass') >= cases.length / 3);
        assert.ok(count((label) => label.kind === 'borderline') >= 5);
      });

      it('turns every case into a module and a concept map that match the schemas', async () => {
        for (const { calibrationCase, input } of await loadCalibration(findTarget(checkId))) {
          assert.equal(ModulePack.safeParse(input.pack).success, true, calibrationCase.id);
          assert.equal(ConceptMap.safeParse(input.map).success, true, calibrationCase.id);
        }
      });
    });

  it('leave the verdict to the judge: a judge that finds nothing passes every case', async () => {
    for (const [checkId, submit] of Object.entries(SUBMISSIONS_THAT_FIND_NOTHING)) {
      const target = findTarget(checkId);
      for (const { calibrationCase, input } of await loadCalibration(target)) {
        const blocks = input.pack.sections
          .flatMap((section) => section.blocks)
          .filter((block) => block.type === 'check');
        const outcome = await target.check.run({ ...input, submission: submit(blocks.length) });
        assert.deepEqual(outcome.problems, [], `${checkId} ${calibrationCase.id}`);
      }
    }
  });

  it('leave the answer-keys verdict to the judge: picking the stored key passes every case', async () => {
    const target = findTarget('answer-keys');
    for (const { calibrationCase, input } of await loadCalibration(target)) {
      const chosen = input.pack.sections
        .flatMap((section) => section.blocks)
        .flatMap((block) => (block.type === 'check' ? [block.answer] : []));
      const submission: CheckSubmission = {
        quizAnswers: chosen.map((answer, index) => ({ target: 'quiz', block: index + 1, chosen: answer }))
      };
      const outcome = await target.check.run({ ...input, submission });
      assert.equal(outcome.pass, true, calibrationCase.id);
    }
  });

  it('refuses a file written for another check', () => {
    assert.throws(
      () => prepareCalibration(findTarget('jargon'), { checkId: 'answer-keys', cases: [{}] }),
      /for answer-keys, not jargon/
    );
  });

  it('refuses two cases with the same id', () => {
    const repeated = {
      id: 'jg-twice',
      expected: 'pass',
      kind: 'clear',
      reason: 'r',
      topic: 't',
      text: ['x'],
      glossary: []
    };
    assert.throws(
      () => prepareCalibration(findTarget('jargon'), { checkId: 'jargon', cases: [repeated, repeated] }),
      /appears twice/
    );
  });

  it('refuses a check that has no calibration set', () => {
    assert.throws(() => findTarget('order'), /not an LLM check/);
  });
});
