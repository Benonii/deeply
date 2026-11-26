import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseReply } from './reply';

describe('reading a judge reply', () => {
  it('takes the JSON out of a fenced block with prose around it', () => {
    const parsed = parseReply(
      'Here is my answer:\n```json\n{ "quizAnswers": [{ "target": "quiz", "block": 1, "chosen": 2 }] }\n```\nDone.'
    );
    assert.deepEqual(parsed, { ok: true, submission: { quizAnswers: [{ target: 'quiz', block: 1, chosen: 2 }] } });
  });

  it('takes a bare JSON object', () => {
    const parsed = parseReply('{"coldReaderWords": [{"word": "quorum", "where": "lesson"}]}');
    assert.equal(parsed.ok, true);
  });

  it('refuses a reply with no JSON in it', () => {
    assert.deepEqual(parseReply('I could not decide.'), { ok: false, error: 'the reply holds no valid JSON object' });
  });

  it('refuses broken JSON', () => {
    assert.deepEqual(parseReply('{"quizAnswers": [}'), { ok: false, error: 'the reply holds no valid JSON object' });
  });

  it('takes the last object when the judge corrects itself', () => {
    const parsed = parseReply(
      '{"quizDistractors":[{"block":1,"hasMistakeBasedOptions":false,"note":"wait {not} quite"}]}\n\nOn reflection:\n{"quizDistractors":[{"block":1,"hasMistakeBasedOptions":true}]}'
    );
    assert.deepEqual(parsed, {
      ok: true,
      submission: { quizDistractors: [{ block: 1, hasMistakeBasedOptions: true }] }
    });
  });

  it('skips a broken object and keeps the valid one before it', () => {
    const parsed = parseReply('{"coldReaderWords": []} and then {"coldReaderWords": [}');
    assert.deepEqual(parsed, { ok: true, submission: { coldReaderWords: [] } });
  });

  it('refuses JSON that does not match the submission schema', () => {
    const parsed = parseReply('{"teachingScores": {"objectiveStated": 9}}');
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /submission schema/);
  });
});
