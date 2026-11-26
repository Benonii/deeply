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
    assert.deepEqual(parseReply('I could not decide.'), { ok: false, error: 'the reply holds no JSON object' });
  });

  it('refuses broken JSON', () => {
    const parsed = parseReply('{"quizAnswers": [}');
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /not valid JSON/);
  });

  it('refuses JSON that does not match the submission schema', () => {
    const parsed = parseReply('{"teachingScores": {"objectiveStated": 9}}');
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /submission schema/);
  });
});
