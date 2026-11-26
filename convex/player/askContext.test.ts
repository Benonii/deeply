import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsCourse } from '../lib/fixtures/pythonGenerators';
import { buildAskContext } from './askContext';
import { resolveExplainBack } from './courseSource';
import { countPointsNeededToPass, readRubricResult } from './rubric';

import type { CourseSource } from './types';

const source: CourseSource = {
  title: pythonGeneratorsCourse.pack.title,
  tagline: pythonGeneratorsCourse.pack.tagline,
  summary: pythonGeneratorsCourse.pack.summary,
  map: pythonGeneratorsCourse.map,
  modules: pythonGeneratorsCourse.pack.modules
};

const ask = (overrides: { moduleId?: string; sectionId?: string; quote?: string; question?: string } = {}) =>
  buildAskContext({
    source,
    moduleId: 'iterator-protocol',
    sectionId: 'running-out',
    quote: 'It reports the end by raising StopIteration from next().',
    question: 'Why does an exhausted cursor keep raising it?',
    ...overrides
  });

describe('buildAskContext', () => {
  it('returns nothing for a module the course does not have', () => {
    assert.equal(ask({ moduleId: 'no-such-module' }), null);
  });

  it('carries the course, the concept map, the glossary, the claims and the module text', () => {
    const context = ask();
    assert.ok(context);
    assert.match(context.prompt, /Python generators, Deeply/);
    assert.match(context.prompt, /Course goal: Stream a log file line by line/);
    assert.match(context.prompt, /- iterator \(core\): An object that returns the next item/);
    assert.match(context.prompt, /\[\[stopiteration\]\] StopIteration —/);
    assert.match(context.prompt, /"When no more data are available a StopIteration exception is raised instead\."/);
    assert.match(context.prompt, /## How a stream says it is empty/);
    assert.match(context.prompt, /Why does an exhausted cursor keep raising it\?/);
  });

  it('includes the prerequisites of the concepts this module teaches', () => {
    const context = ask();
    assert.ok(context);
    assert.ok(context.conceptIds.includes('iterable'));
    assert.match(context.prompt, /\[needs: iterable\]/);
  });

  it('keeps every part of the context inside the budget', () => {
    const context = ask();
    assert.ok(context);
    assert.ok(context.characters < 20000, `context was ${context.characters} characters`);
    assert.equal(context.parts.reduce((total, part) => total + part.characters, 0) > 0, true);
    assert.deepEqual(
      context.parts.filter((part) => part.isTrimmed),
      []
    );
  });

  it('drops the sections furthest from the selection when the module is too long', () => {
    const filler = { type: 'p' as const, text: 'x'.repeat(4000) };
    const wordy = {
      ...source.modules[0],
      sections: [...Array(12).keys()].map((index) => ({
        id: `s${index}`,
        title: `Section ${index}`,
        blocks: [filler]
      }))
    };
    const context = buildAskContext({
      source: { ...source, modules: [wordy] },
      moduleId: wordy.id,
      sectionId: 's11',
      quote: 'xxx',
      question: 'What is this?'
    });
    assert.ok(context);
    assert.match(context.prompt, /## Section 11/);
    assert.match(context.prompt, /## Section 10/);
    assert.doesNotMatch(context.prompt, /## Section 0\b/);
    assert.ok(context.parts.some((part) => part.name === 'moduleText' && part.isTrimmed));
    assert.ok(context.characters < 22000, `context was ${context.characters} characters`);
  });
});

describe('resolveExplainBack', () => {
  it('finds the block a subject id points at', () => {
    const block = resolveExplainBack(source, 'explainback:iterator-protocol/running-out/2');
    assert.equal(block?.conceptId, 'iterator');
    assert.equal(block?.rubric.length, 3);
  });

  it('refuses a subject id that points at another kind of block', () => {
    assert.equal(resolveExplainBack(source, 'explainback:iterator-protocol/running-out/1'), null);
    assert.equal(resolveExplainBack(source, 'check:iterator-protocol/running-out/2'), null);
    assert.equal(resolveExplainBack(source, 'explainback:iterator-protocol/running-out/99'), null);
    assert.equal(resolveExplainBack(source, 'nonsense'), null);
  });
});

describe('the rubric pass rule', () => {
  it('needs two thirds of the points, rounded up', () => {
    assert.deepEqual([1, 2, 3, 4, 5].map(countPointsNeededToPass), [1, 2, 2, 3, 4]);
  });

  it('reads a marked rubric and decides the pass', () => {
    const rubric = ['one', 'two', 'three'];
    const text = JSON.stringify({
      points: [
        { isMet: true, note: 'yes' },
        { isMet: true, note: 'yes' },
        { isMet: false, note: 'no' }
      ]
    });
    assert.deepEqual(readRubricResult(text, rubric), {
      status: 'read',
      isPass: true,
      points: [
        { isMet: true, note: 'yes' },
        { isMet: true, note: 'yes' },
        { isMet: false, note: 'no' }
      ]
    });
  });

  it('fails an answer that misses most of the rubric', () => {
    const marked = {
      points: [
        { isMet: true, note: 'yes' },
        { isMet: false, note: 'no' },
        { isMet: false, note: 'no' }
      ]
    };
    const reading = readRubricResult(JSON.stringify(marked), ['one', 'two', 'three']);
    assert.equal(reading.status === 'read' && reading.isPass, false);
  });

  it('rejects a marking that does not match the rubric', () => {
    const marked = { points: [{ isMet: true, note: 'yes' }] };
    assert.equal(readRubricResult(JSON.stringify(marked), ['one', 'two']).status, 'unreadable');
    assert.equal(readRubricResult('not json at all', ['one']).status, 'unreadable');
    assert.equal(readRubricResult('{"points":[{"isMet":"maybe","note":"x"}]}', ['one']).status, 'unreadable');
  });
});
