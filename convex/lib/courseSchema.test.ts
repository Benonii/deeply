import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { crdtsPack } from '../../src/courses/crdts/pack';
import { fakeChallenges, fakeModule, fakePlan } from '../generate/fake';
import { ChallengesOutput, ModuleOutput, PlanOutput } from '../generate/shapes';
import { Block, CoursePack, ModulePack } from './courseSchema';
import { pythonGeneratorsPack } from './fixtures/pythonGenerators';

const issuesOf = (result: { error?: { issues: unknown[] } }) => result.error?.issues ?? [];

describe('courseSchema version 1 compatibility', () => {
  it('still parses the built-in CRDTs course', () => {
    assert.deepEqual(issuesOf(CoursePack.safeParse(crdtsPack)), []);
  });

  it('still parses every module of the built-in CRDTs course', () => {
    for (const courseModule of crdtsPack.modules)
      assert.deepEqual(issuesOf(ModulePack.safeParse(courseModule)), [], `module ${courseModule.id}`);
  });

  it('leaves schemaVersion undefined on a version 1 module', () => {
    const parsed = ModulePack.parse({
      id: 'why-sync',
      n: 1,
      title: 'Why sync is hard',
      kicker: 'Replicas and partitions',
      minutes: 25,
      summary: 'What goes wrong when copies change independently.',
      sections: [{ id: 's1', title: 'Replicas', blocks: [{ type: 'p', text: 'Every device keeps a copy.' }] }]
    });
    assert.equal(parsed.schemaVersion, undefined);
    assert.equal(parsed.conceptIds, undefined);
  });

  it('still parses what the generator produces', () => {
    const plan = PlanOutput.parse(fakePlan('caches', 'concept', []));
    assert.deepEqual(issuesOf(ModuleOutput.safeParse(fakeModule(plan.modules[0], 1))), []);
    assert.deepEqual(issuesOf(ChallengesOutput.safeParse(fakeChallenges(plan.modules))), []);
  });

  it('still parses a check block with no conceptId', () => {
    assert.deepEqual(
      issuesOf(
        Block.safeParse({ type: 'check', q: 'Which one?', options: ['a', 'b'], answer: 0, explain: 'Because a.' })
      ),
      []
    );
  });
});

describe('courseSchema version 2 additions', () => {
  it('parses the version 2 fixture course', () => {
    const parsed = CoursePack.safeParse(pythonGeneratorsPack);
    assert.deepEqual(issuesOf(parsed), []);
    assert.equal(parsed.data?.schemaVersion, 2);
    assert.equal(parsed.data?.modules[0].schemaVersion, 2);
  });

  it('rejects a video id that is not 11 characters', () => {
    const result = Block.safeParse({
      type: 'video',
      youtubeId: 'short',
      title: 'Python generators',
      channel: 'A channel',
      startSec: 0,
      endSec: 60,
      conceptId: 'iterator'
    });
    assert.equal(result.success, false);
  });

  it('rejects a runnable language the browser cannot run', () => {
    const result = Block.safeParse({ type: 'code', lang: 'ruby', code: 'puts 1', runnable: 'ruby' });
    assert.equal(result.success, false);
  });

  it('rejects a concept id that is not kebab case', () => {
    const result = Block.safeParse({
      type: 'explainback',
      conceptId: 'Lazy Evaluation',
      prompt: 'Explain where the memory went.',
      rubric: ['Says values are produced on demand']
    });
    assert.equal(result.success, false);
  });

  it('rejects an explain-back rubric with more than five points', () => {
    const result = Block.safeParse({
      type: 'explainback',
      conceptId: 'lazy-evaluation',
      prompt: 'Explain where the memory went.',
      rubric: ['one', 'two', 'three', 'four', 'five', 'six']
    });
    assert.equal(result.success, false);
  });

  it('keeps runnable and expectedOutput on a code block', () => {
    const parsed = Block.parse({
      type: 'code',
      lang: 'python',
      code: "print('hi')",
      runnable: 'python',
      expectedOutput: 'hi\n'
    });
    assert.equal(parsed.type, 'code');
    if (parsed.type !== 'code') return;
    assert.equal(parsed.runnable, 'python');
    assert.equal(parsed.expectedOutput, 'hi\n');
  });
});
