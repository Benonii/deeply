import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../lib/fixtures/pythonGeneratorsMap';
import { iteratorProtocolModule } from '../lib/fixtures/pythonGeneratorsModules';
import { CHECK_REGISTRY } from './registry';
import { decideModuleFate, MAX_RETRIES, runChecks } from './runner';
import type { CheckID, CheckModule, CheckRegistration, CheckResult, CheckStage } from './types';

const input = { pack: iteratorProtocolModule, map: pythonGeneratorsMap };

const fakeCheck = (checkId: CheckID, stage: CheckStage, pass: boolean): CheckModule => ({
  checkId,
  version: '0.0.1',
  stage,
  run: () => ({ pass, problems: pass ? [] : [{ where: 'here', message: 'no' }], fixNote: pass ? '' : `fix ${checkId}` })
});

const result = (checkId: CheckID, mode: CheckResult['mode'], pass: boolean): CheckResult => ({
  checkId,
  version: '0.0.1',
  mode,
  pass,
  problems: [],
  fixNote: `fix ${checkId}`
});

describe('the registry', () => {
  it('holds all nine checks once, in the documented order', () => {
    assert.deepEqual(
      CHECK_REGISTRY.map((registration) => registration.check.checkId),
      [
        'code-runs',
        'answer-keys',
        'facts-cited',
        'order',
        'jargon',
        'load',
        'quiz-quality',
        'links-and-videos',
        'teaching-quality'
      ]
    );
  });

  it('gives every check its own version', () => {
    for (const { check } of CHECK_REGISTRY) assert.match(check.version, /^\d+\.\d+\.\d+$/);
  });
});

describe('runChecks', () => {
  it('runs code checks before network and agent checks, whatever the registry order says', async () => {
    const registry: CheckRegistration[] = [
      { check: fakeCheck('teaching-quality', 'agent', true), mode: 'on' },
      { check: fakeCheck('links-and-videos', 'network', true), mode: 'on' },
      { check: fakeCheck('order', 'code', true), mode: 'on' },
      { check: fakeCheck('load', 'code', true), mode: 'on' }
    ];
    const run = await runChecks(input, { registry });
    assert.deepEqual(
      run.results.map((entry) => entry.checkId),
      ['order', 'load', 'links-and-videos', 'teaching-quality']
    );
  });

  it('skips a check switched off and one whose stage was not asked for', async () => {
    const registry: CheckRegistration[] = [
      { check: fakeCheck('order', 'code', true), mode: 'on' },
      { check: fakeCheck('load', 'code', true), mode: 'off' },
      { check: fakeCheck('code-runs', 'agent', false), mode: 'on' }
    ];
    const run = await runChecks(input, { registry, stages: ['code'] });
    assert.deepEqual(
      run.results.map((entry) => entry.checkId),
      ['order']
    );
    assert.deepEqual(run.skipped, ['load', 'code-runs']);
  });

  it('stamps every result with the mode the registry set', async () => {
    const registry: CheckRegistration[] = [{ check: fakeCheck('jargon', 'code', false), mode: 'shadow' }];
    const run = await runChecks(input, { registry });
    assert.equal(run.results[0].mode, 'shadow');
    assert.equal(run.results[0].pass, false);
  });

  it('turns a check that throws into a failed result instead of losing the run', async () => {
    const thrower: CheckModule = {
      checkId: 'links-and-videos',
      version: '0.0.1',
      stage: 'network',
      run: () => {
        throw new Error('the network went away');
      }
    };
    const registry: CheckRegistration[] = [
      { check: thrower, mode: 'on' },
      { check: fakeCheck('order', 'code', true), mode: 'on' }
    ];
    const run = await runChecks(input, { registry });
    assert.equal(run.results.length, 2);
    assert.match(run.results[1].problems[0].message, /the check itself failed: the network went away/);
  });
});

describe('decideModuleFate', () => {
  it('passes a module whose blocking checks all pass', () => {
    const results = [result('order', 'on', true), result('jargon', 'shadow', false)];
    assert.deepEqual(decideModuleFate({ results, attempt: 1 }), { kind: 'pass' });
  });

  it('never blocks on a shadow failure', () => {
    const results = [result('jargon', 'shadow', false)];
    assert.deepEqual(decideModuleFate({ results, attempt: 3 }), { kind: 'pass' });
  });

  it('asks for a retry with the fix notes of the failed blocking checks', () => {
    const results = [result('code-runs', 'on', false), result('jargon', 'shadow', false)];
    assert.deepEqual(decideModuleFate({ results, attempt: 1 }), {
      kind: 'retry',
      nextAttempt: 2,
      fixNotes: ['code-runs: fix code-runs']
    });
  });

  it('publishes unverified once the retries are used up', () => {
    const results = [result('code-runs', 'on', false)];
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1)
      assert.equal(decideModuleFate({ results, attempt }).kind, 'retry');
    assert.deepEqual(decideModuleFate({ results, attempt: MAX_RETRIES + 1 }), {
      kind: 'publish-unverified',
      fixNotes: ['code-runs: fix code-runs']
    });
  });
});
