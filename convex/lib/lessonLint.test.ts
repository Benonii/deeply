import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Block, CoursePack, GlossaryTerm, ModulePack } from './courseSchema';
import { pythonGeneratorsMap } from './fixtures/pythonGeneratorsMap';
import { pythonGeneratorsPack } from './fixtures/pythonGenerators';
import { lintCourseV2, lintLessonV2 } from './lessonLint';
import { parseCitations, parseTermReferences } from './lessonMarks';

const glossary: GlossaryTerm[] = [
  { id: 'iterable', term: 'iterable', definition: 'An object you can hand to iter().' },
  { id: 'iterator', term: 'iterator', definition: 'An object whose __next__() returns the next item.' }
];

const lessonWith = (blocks: Block[], overrides: Partial<ModulePack> = {}): ModulePack => ({
  id: 'iterator-protocol',
  n: 1,
  title: 'The iterator protocol',
  kicker: 'What a for loop actually calls',
  minutes: 10,
  summary: 'The two calls a for loop makes, and how a stream reports that it is empty.',
  schemaVersion: 2,
  conceptIds: ['iterable', 'iterator'],
  glossary,
  sections: [{ id: 'two-calls', title: 'Two calls, not one', conceptIds: ['iterable'], blocks }],
  ...overrides
});

const lint = (blocks: Block[], overrides: Partial<ModulePack> = {}): string[] =>
  lintLessonV2(lessonWith(blocks, overrides), pythonGeneratorsMap);

const expectOnly = (errors: string[], pattern: RegExp) => {
  assert.deepEqual(errors.length, 1, `expected one error, got ${JSON.stringify(errors)}`);
  assert.match(errors[0], pattern);
};

const expectAmong = (errors: string[], pattern: RegExp) => {
  assert.ok(
    errors.some((error) => pattern.test(error)),
    `no error matched ${pattern} in ${JSON.stringify(errors)}`
  );
};

describe('parseTermReferences', () => {
  it('reads a bare mark', () => {
    assert.deepEqual(parseTermReferences('An [[iterator]] has no length.'), [{ id: 'iterator', display: 'iterator' }]);
  });

  it('reads a mark with its own display text', () => {
    assert.deepEqual(parseTermReferences('Lists are [[iterable|iterables]].'), [
      { id: 'iterable', display: 'iterables' }
    ]);
  });

  it('reads every mark in one string', () => {
    assert.deepEqual(parseTermReferences('[[iterable]] to [[iterator|cursor]]'), [
      { id: 'iterable', display: 'iterable' },
      { id: 'iterator', display: 'cursor' }
    ]);
  });

  it('finds nothing in plain prose', () => {
    assert.deepEqual(parseTermReferences('A for loop calls iter() and then next().'), []);
  });
});

describe('parseCitations', () => {
  it('reads every citation mark in one string', () => {
    assert.deepEqual(parseCitations('An iterator raises StopIteration. [^py-glossary] So do generators. [^py-howto]'), [
      { sourceId: 'py-glossary' },
      { sourceId: 'py-howto' }
    ]);
  });

  it('ignores a term mark and plain prose', () => {
    assert.deepEqual(parseCitations('An [[iterator]] has no length.'), []);
  });

  it('ignores a mark that is not a kebab-case source id', () => {
    assert.deepEqual(parseCitations('The class [^A-Z0-9_] names no source.'), []);
  });
});

describe('lintCourseV2 on the valid fixture course', () => {
  it('reports nothing', () => {
    assert.deepEqual(lintCourseV2(pythonGeneratorsPack, pythonGeneratorsMap), []);
  });
});

describe('lintLessonV2 glossary marks', () => {
  it('passes a mark that this module defines', () => {
    assert.deepEqual(lint([{ type: 'p', text: 'An [[iterator]] is a cursor.' }]), []);
  });

  it('fails a mark with no glossary entry', () => {
    expectOnly(
      lint([{ type: 'p', text: 'A [[coroutine]] is something else.' }]),
      /\[\[coroutine\]\] has no glossary entry/
    );
  });

  it('fails a mark inside a check explanation too', () => {
    const errors = lint([
      {
        type: 'check',
        q: 'Which object holds the position?',
        options: ['The list', 'The cursor'],
        answer: 1,
        explain: 'The [[coroutine]] holds it.',
        conceptId: 'iterator'
      }
    ]);
    expectOnly(errors, /\[\[coroutine\]\] has no glossary entry/);
  });

  it('leaves double brackets inside source code alone', () => {
    const errors = lint([
      { type: 'code', lang: 'python', code: 'first_row = frame[[0]]', note: 'Picks one column as a frame.' }
    ]);
    assert.deepEqual(errors, []);
  });

  it('still reads a mark in the note beside a code block', () => {
    const errors = lint([{ type: 'code', lang: 'python', code: 'x = 1', note: 'A [[coroutine]] is different.' }]);
    expectOnly(errors, /\[\[coroutine\]\] has no glossary entry/);
  });

  it('resolves a mark against a term an earlier module taught', () => {
    const laterLesson = structuredClone(pythonGeneratorsPack.modules[1]);
    expectAmong(lintLessonV2(laterLesson, pythonGeneratorsMap), /\[\[iterator\]\] has no glossary entry/);
    assert.deepEqual(
      lintLessonV2(laterLesson, pythonGeneratorsMap, { termIdsTaughtEarlier: new Set(['iterator']) }),
      []
    );
  });

  it('fails a glossary term pointing at a module the map does not have', () => {
    const errors = lint([{ type: 'p', text: 'A cursor walks the stream.' }], {
      glossary: [{ id: 'iterator', term: 'iterator', definition: 'A cursor.', taughtIn: 'coroutines' }]
    });
    expectOnly(errors, /glossary term iterator is taughtIn unknown module coroutines/);
  });

  it('fails two glossary entries sharing an id', () => {
    const errors = lint([{ type: 'p', text: 'A cursor walks the stream.' }], {
      glossary: [...glossary, { id: 'iterator', term: 'iterator', definition: 'A second entry.' }]
    });
    expectOnly(errors, /duplicate glossary id iterator/);
  });
});

describe('lintLessonV2 concept ids', () => {
  it('fails a concept id the map does not have', () => {
    const errors = lint([
      {
        type: 'explainback',
        conceptId: 'coroutine',
        prompt: 'Explain the difference.',
        rubric: ['Names the suspension point']
      }
    ]);
    expectOnly(errors, /unknown concept coroutine/);
  });

  it('fails a concept taught by a later module', () => {
    const errors = lint([
      {
        type: 'article',
        url: 'https://docs.python.org/3/howto/functional.html',
        title: 'Functional Programming HOWTO',
        site: 'docs.python.org',
        conceptId: 'lazy-evaluation',
        minutes: 25
      }
    ]);
    expectOnly(errors, /uses concept lazy-evaluation before the module that teaches it/);
  });

  it('passes a concept the map marks assumed', () => {
    const errors = lint([
      {
        type: 'explainback',
        conceptId: 'function-call',
        prompt: 'Say what calling a function does.',
        rubric: ['Names the parentheses']
      }
    ]);
    assert.deepEqual(errors, []);
  });

  it('fails conceptIds that disagree with the concept map plan', () => {
    const errors = lint([{ type: 'p', text: 'A cursor walks the stream.' }], { conceptIds: ['iterable'] });
    expectOnly(errors, /conceptIds \[iterable\] do not match the concept map plan/);
  });

  it('fails a module the concept map never planned', () => {
    const errors = lint([{ type: 'p', text: 'A cursor walks the stream.' }], { id: 'coroutines' });
    expectOnly(errors, /module coroutines: the concept map has no module with this id/);
  });

  it('fails a module number that disagrees with the plan order', () => {
    const errors = lint([{ type: 'p', text: 'A cursor walks the stream.' }], { n: 4 });
    expectOnly(errors, /n is 4, the concept map says order 1/);
  });
});

describe('lintLessonV2 blocks', () => {
  it('fails a quiz answer outside the options', () => {
    const errors = lint([
      {
        type: 'check',
        q: 'Which object holds the position?',
        options: ['The list', 'The cursor'],
        answer: 5,
        explain: 'The cursor holds it.',
        conceptId: 'iterator'
      }
    ]);
    expectOnly(errors, /check answer out of range/);
  });

  it('fails a quiz with no conceptId', () => {
    const errors = lint([
      {
        type: 'check',
        q: 'Which object holds the position?',
        options: ['The list', 'The cursor'],
        answer: 1,
        explain: 'The cursor holds it.'
      }
    ]);
    expectOnly(errors, /check "Which object holds the position\?" has no conceptId/);
  });

  it('fails a video clip that ends before it starts', () => {
    const errors = lint([
      {
        type: 'video',
        youtubeId: 'Bzfu83LiEZs',
        title: 'Python GENERATORS & using Yield keyword',
        channel: 'Programming and Math Tutorials',
        startSec: 120,
        endSec: 10,
        conceptId: 'iterator'
      }
    ]);
    expectOnly(errors, /video Bzfu83LiEZs ends at 10s, starts at 120s/);
  });
});

describe('lintLessonV2 version marking', () => {
  it('fails a module that is not marked version 2', () => {
    const errors = lint([{ type: 'p', text: 'A cursor walks the stream.' }], { schemaVersion: undefined });
    expectOnly(errors, /module iterator-protocol: schemaVersion must be 2/);
  });

  it('fails a module with no conceptIds at all', () => {
    const errors = lint([{ type: 'p', text: 'A cursor walks the stream.' }], { conceptIds: undefined });
    expectOnly(errors, /module iterator-protocol: conceptIds is missing/);
  });
});

describe('lintCourseV2 course level checks', () => {
  const brokenCourse = (breakIt: (pack: CoursePack) => void): string[] => {
    const pack = structuredClone(pythonGeneratorsPack);
    breakIt(pack);
    return lintCourseV2(pack, pythonGeneratorsMap);
  };

  it('fails a challenge with no conceptId', () => {
    expectOnly(
      brokenCourse((pack) => {
        pack.challenges[0].conceptId = undefined;
      }),
      /challenge c1: has no conceptId/
    );
  });

  it('fails a challenge naming a concept the map does not have', () => {
    expectOnly(
      brokenCourse((pack) => {
        pack.challenges[1].conceptId = 'coroutine';
      }),
      /challenge c2: unknown concept coroutine/
    );
  });

  it('fails a planned module that nobody wrote', () => {
    expectOnly(
      brokenCourse((pack) => {
        pack.modules = [pack.modules[0]];
      }),
      /no module written for writing-generators/
    );
  });

  it('fails a written module the map never planned', () => {
    expectAmong(
      brokenCourse((pack) => {
        pack.modules[1].id = 'coroutines';
      }),
      /module coroutines is not in the concept map/
    );
  });

  it('fails a course that is not marked version 2', () => {
    expectOnly(
      brokenCourse((pack) => {
        pack.schemaVersion = undefined;
      }),
      /course python-generators: schemaVersion must be 2/
    );
  });
});
