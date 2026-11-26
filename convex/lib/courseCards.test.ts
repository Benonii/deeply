import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readRequestCardStatus } from './courseCards';

describe('readRequestCardStatus', () => {
  it('shows a request Claude started as researching, with the queue step done', () => {
    assert.deepEqual(readRequestCardStatus({ status: 'queued', origin: 'claude' }), {
      kind: 'building',
      stage: 'researching',
      stepsDone: ['queued']
    });
  });

  it('keeps a request made in chat queued until Claude sends research', () => {
    assert.deepEqual(readRequestCardStatus({ status: 'queued', origin: 'chat' }), {
      kind: 'building',
      stage: 'queued',
      stepsDone: []
    });
  });

  it('moves to the concept map once research is in', () => {
    assert.deepEqual(readRequestCardStatus({ status: 'researching', origin: 'chat' }), {
      kind: 'building',
      stage: 'mapping',
      stepsDone: ['queued', 'researching']
    });
  });

  it('stays on writing from the stored map until every module is ready', () => {
    for (const status of ['mapping', 'writing'] as const)
      assert.deepEqual(readRequestCardStatus({ status, origin: 'claude' }), {
        kind: 'building',
        stage: 'writing',
        stepsDone: ['queued', 'researching', 'mapping']
      });
  });

  it('counts the checks done and waits on publishing once every module is ready', () => {
    assert.deepEqual(readRequestCardStatus({ status: 'checking', origin: 'claude' }), {
      kind: 'building',
      stage: 'published',
      stepsDone: ['queued', 'researching', 'mapping', 'writing', 'checking']
    });
  });

  it('reads published as ready and failed with its reason', () => {
    assert.deepEqual(readRequestCardStatus({ status: 'published', origin: 'claude' }), { kind: 'ready' });
    assert.deepEqual(readRequestCardStatus({ status: 'failed', origin: 'claude', error: 'No sources.' }), {
      kind: 'failed',
      reason: 'No sources.'
    });
  });
});
