import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findTarget, loadCalibration } from './calibration';
import { createFakeJudge } from './judges';
import { buildCheckPrompt } from './prompt';
import { runEval } from './runEval';

import type { PreparedCase } from './types';

const pickCases = (cases: PreparedCase[], ids: string[]) =>
  cases.filter(({ calibrationCase }) => ids.includes(calibrationCase.id));

describe('a calibration run with a fake judge', () => {
  it('scores answer-keys from the replies, through the check itself', async () => {
    const target = findTarget('answer-keys');
    const cases = pickCases(await loadCalibration(target), ['ak-list-append', 'ak-http-not-found', 'ak-typeof-null']);
    const judge = createFakeJudge({
      'ak-list-append': '{"quizAnswers": [{"target": "quiz", "block": 1, "chosen": 1}]}',
      'ak-http-not-found': '```json\n{"quizAnswers": [{"target": "quiz", "block": 1, "chosen": 2}]}\n```',
      'ak-typeof-null': 'I think it is "null".'
    });
    const report = await runEval({ target, cases, judge, concurrency: 2 });
    const outcomes = Object.fromEntries(report.results.map((result) => [result.id, result.got]));
    assert.deepEqual(outcomes, { 'ak-list-append': 'pass', 'ak-http-not-found': 'fail', 'ak-typeof-null': 'error' });
    assert.equal(report.score.correct, 2);
    assert.deepEqual(
      report.disagreements.map((result) => result.id),
      ['ak-typeof-null']
    );
  });

  it('turns a teaching score below 3 into a fail even though that check never blocks', async () => {
    const target = findTarget('teaching-quality');
    const cases = pickCases(await loadCalibration(target), ['tq-no-practice']);
    const judge = createFakeJudge({
      'tq-no-practice':
        '{"teachingScores": {"objectiveStated": 4, "workedExample": 4, "practice": 1, "mistakeAddressed": 4, "levelFits": 4, "note": "no practice"}}'
    });
    const report = await runEval({ target, cases, judge, concurrency: 1 });
    assert.equal(report.results[0].got, 'fail');
    assert.deepEqual(report.disagreements, []);
  });

  it('records a judge that throws as an error, not a crash', async () => {
    const target = findTarget('jargon');
    const cases = pickCases(await loadCalibration(target), ['jg-plain-settings']);
    const report = await runEval({ target, cases, judge: createFakeJudge({}), concurrency: 1 });
    assert.equal(report.results[0].got, 'error');
    assert.match(report.results[0].error ?? '', /no reply for jg-plain-settings/);
  });
});

describe('the prompt a judge gets', () => {
  it('carries the check prompt, the module and the submission schema', async () => {
    const target = findTarget('quiz-quality');
    const [prepared] = await loadCalibration(target);
    const prompt = buildCheckPrompt(target, prepared.input);
    assert.ok(prompt.includes(target.check.prompt ?? 'missing'));
    assert.ok(prompt.includes(prepared.input.pack.sections[0].id));
    assert.match(prompt, /"quizDistractors"/);
  });

  it('hides the answer key from the answer-keys judge', async () => {
    const target = findTarget('answer-keys');
    const [prepared] = pickCases(await loadCalibration(target), ['ak-http-not-found']);
    const prompt = buildCheckPrompt(target, prepared.input);
    const module = prompt.slice(prompt.indexOf('## The module'), prompt.indexOf('## How to reply'));
    assert.doesNotMatch(module, /"answer"/);
    assert.doesNotMatch(module, /"explain"/);
    assert.match(module, /Which HTTP status code/);
  });

  it('shows the cited sources to the facts-cited judge', async () => {
    const target = findTarget('facts-cited');
    const [prepared] = pickCases(await loadCalibration(target), ['fc-page-size']);
    assert.match(buildCheckPrompt(target, prepared.input), /If limit is omitted, the API returns 50 items per page/);
  });
});
