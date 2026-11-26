import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../../lib/fixtures/pythonGeneratorsMap';
import { answerKeysCheck } from './check';
import { answerKeysExamples } from './examples';
import type { QuizAnswer } from '../submissionSchema';

const check = (quizAnswers?: QuizAnswer[]) =>
  answerKeysCheck.run({
    pack: answerKeysExamples.pack,
    map: pythonGeneratorsMap,
    challenges: answerKeysExamples.challenges,
    submission: { quizAnswers }
  });

describe('check 2, answer keys', () => {
  it('passes when the blind answers match every key', async () => {
    const result = await check(answerKeysExamples.passing);
    assert.equal(result.pass, true);
    assert.deepEqual(result.problems, []);
  });

  it('fails the question whose key disagrees, and names both options', async () => {
    const result = await check(answerKeysExamples.failingWrongKey);
    assert.equal(result.pass, false);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /quiz 1 was answered A "\[10, 20, 30\]", the key says B "\[\]"/);
    assert.match(result.fixNote, /fix the key or make the question unambiguous/);
  });

  it('fails a question left unanswered', async () => {
    const result = await check(answerKeysExamples.failingUnanswered);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /challenge c1 was not answered/);
  });

  it('fails when nothing was answered', async () => {
    const result = await check(undefined);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /answer all 2 questions/);
  });

  it('reports an out-of-range pick as the option that does not exist', async () => {
    const result = await check([
      { target: 'quiz', block: 1, chosen: 9 },
      { target: 'challenge', id: 'c1', chosen: 0 }
    ]);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /option 9, which does not exist/);
  });
});
