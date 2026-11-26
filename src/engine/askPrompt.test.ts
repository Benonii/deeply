import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildContinueInClaudePrompt, buildContinueInClaudeURL } from './askPrompt';

const input = {
  courseTitle: 'Python generators, Deeply',
  moduleTitle: 'The iterator protocol',
  quote: 'It reports the end by raising [[stopiteration|StopIteration]] from next().',
  question: 'Why does an exhausted cursor keep raising it?',
  answer: 'An [[iterator]] holds no position to rewind to, so `next()` raises again.'
};

describe('buildContinueInClaudePrompt', () => {
  it('carries the course, the module, the passage, the question and the answer', () => {
    const prompt = buildContinueInClaudePrompt(input);
    assert.match(prompt, /course called "Python generators, Deeply", in the module "The iterator protocol"/);
    assert.match(prompt, /"It reports the end by raising StopIteration from next\(\)\."/);
    assert.match(prompt, /Why does an exhausted cursor keep raising it\?/);
    assert.match(prompt, /An iterator holds no position to rewind to/);
  });

  it('keeps term marks out of the prompt, because they mean nothing outside the course', () => {
    assert.doesNotMatch(buildContinueInClaudePrompt(input), /\[\[/);
  });

  it('caps a long answer and the whole prompt', () => {
    const prompt = buildContinueInClaudePrompt({ ...input, answer: 'a'.repeat(9000) });
    assert.ok(prompt.length <= 6000, `prompt was ${prompt.length} characters`);
    assert.match(prompt, /…/);
  });
});

describe('buildContinueInClaudeURL', () => {
  it('opens a new chat with the prompt in the q parameter', () => {
    const url = new URL(buildContinueInClaudeURL(buildContinueInClaudePrompt(input)));
    assert.equal(url.origin, 'https://claude.ai');
    assert.equal(url.pathname, '/new');
    assert.match(url.searchParams.get('q') ?? '', /Why does an exhausted cursor keep raising it\?/);
  });

  it('encodes every character that would break the link', () => {
    const url = buildContinueInClaudeURL('a & b = c? "quoted" #hash\nnewline');
    assert.ok(!url.slice('https://claude.ai/new?q='.length).match(/[&=?#"\s]/));
    assert.equal(new URL(url).searchParams.get('q'), 'a & b = c? "quoted" #hash\nnewline');
  });

  it('caps the link length', () => {
    assert.ok(buildContinueInClaudeURL('x'.repeat(20000)).length < 6100);
  });
});
