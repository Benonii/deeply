import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lintConceptMap } from './conceptMapLint';
import { ConceptMap } from './conceptMapSchema';
import { pythonGeneratorsMap } from './fixtures/pythonGeneratorsMap';

const lintBroken = (breakIt: (map: ConceptMap) => void): string[] => {
  const map = structuredClone(pythonGeneratorsMap);
  breakIt(map);
  return lintConceptMap(map);
};

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

describe('lintConceptMap on a valid map', () => {
  it('parses the fixture map against the schema', () => {
    assert.deepEqual(ConceptMap.safeParse(pythonGeneratorsMap).error?.issues ?? [], []);
  });

  it('reports nothing', () => {
    assert.deepEqual(lintConceptMap(pythonGeneratorsMap), []);
  });
});

describe('lintConceptMap rule 1, no cycles', () => {
  it('names the loop when prerequisites run in a circle', () => {
    const errors = lintBroken((map) => {
      map.edges.push({ from: 'lazy-evaluation', to: 'iterable' });
    });
    expectAmong(errors, /prerequisite cycle .*lazy-evaluation -> iterable/);
  });
});

describe('lintConceptMap rule 2, prerequisites come earlier or are assumed', () => {
  it('fails when a prerequisite is taught after the concept that needs it', () => {
    const errors = lintBroken((map) => {
      map.modules[0].order = 2;
      map.modules[1].order = 1;
    });
    expectOnly(errors, /prerequisite iterator is not taught before generator-function/);
  });

  it('passes an assumed prerequisite that no module teaches', () => {
    assert.deepEqual(lintConceptMap(pythonGeneratorsMap), []);
  });

  it('fails when a taught concept is a prerequisite of an assumed one', () => {
    const errors = lintBroken((map) => {
      map.edges.push({ from: 'iterator', to: 'function-call' });
    });
    expectOnly(errors, /function-call is assumed known, so its prerequisite cannot be taught/);
  });
});

describe('lintConceptMap rule 3, at most three new concepts a module', () => {
  it('fails a module that teaches four', () => {
    const errors = lintBroken((map) => {
      map.concepts.push(
        {
          id: 'comprehension',
          name: 'comprehension',
          definition: 'A bracketed expression that builds a whole list in one pass.',
          role: 'supporting',
          sourceIds: ['py-functional-howto']
        },
        {
          id: 'generator-expression',
          name: 'generator expression',
          definition: 'A generator written inline in parentheses instead of as a function.',
          role: 'supporting',
          sourceIds: ['py-functional-howto']
        }
      );
      map.edges.push(
        { from: 'comprehension', to: 'generator-expression' },
        { from: 'generator-expression', to: 'lazy-evaluation' }
      );
      map.modules[1].conceptIds = ['comprehension', 'generator-expression', 'generator-function', 'lazy-evaluation'];
    });
    expectOnly(errors, /module writing-generators: teaches 4 new concepts, at most 3 allowed/);
  });
});

describe('lintConceptMap rule 4, every concept is defined and sourced', () => {
  it('fails a taught concept with no source', () => {
    const errors = lintBroken((map) => {
      map.concepts[1].sourceIds = [];
    });
    expectOnly(errors, /concept iterable: no source backs it/);
  });

  it('fails a source id that is not in the source list', () => {
    const errors = lintBroken((map) => {
      map.concepts[1].sourceIds = ['some-blog'];
    });
    expectOnly(errors, /concept iterable: unknown source some-blog/);
  });

  it('fails a blank definition', () => {
    const errors = lintBroken((map) => {
      map.concepts[2].definition = '   ';
    });
    expectOnly(errors, /concept iterator: definition is blank/);
  });

  it('fails a definition that runs over more than one line', () => {
    const errors = lintBroken((map) => {
      map.concepts[2].definition = 'An object with __next__.\nIt raises StopIteration at the end.';
    });
    expectOnly(errors, /concept iterator: definition must be one line/);
  });
});

describe('lintConceptMap rule 5, every concept reaches the goal', () => {
  it('fails a concept nothing downstream of it needs', () => {
    const errors = lintBroken((map) => {
      map.concepts.push({
        id: 'repr-dunder',
        name: '__repr__',
        definition: 'The method that gives an object its developer-facing string form.',
        role: 'core',
        sourceIds: ['py-glossary']
      });
      map.modules.push({
        id: 'reprs',
        order: 3,
        conceptIds: ['repr-dunder'],
        objective: { verb: 'write', object: 'a __repr__ for a small class', context: 'debugging in the REPL' }
      });
    });
    expectOnly(errors, /concept repr-dunder: nothing it leads to reaches the goal/);
  });
});

describe('lintConceptMap rule 6, objectives name an observable action', () => {
  it('fails the banned verbs', () => {
    for (const verb of ['understand', 'Know', 'learn', 'appreciate', 'be familiar with']) {
      const errors = lintBroken((map) => {
        map.modules[0].objective.verb = verb;
      });
      expectOnly(errors, /objective verb .* names no observable action/);
    }
  });

  it('passes an action verb', () => {
    const errors = lintBroken((map) => {
      map.modules[0].objective.verb = 'predict';
    });
    assert.deepEqual(errors, []);
  });
});

describe('lintConceptMap referential integrity', () => {
  it('fails a duplicate concept id', () => {
    const errors = lintBroken((map) => {
      map.concepts.push(structuredClone(map.concepts[1]));
    });
    expectOnly(errors, /concepts: duplicate id iterable/);
  });

  it('fails an edge that names a concept the map does not have', () => {
    const errors = lintBroken((map) => {
      map.edges.push({ from: 'iterator', to: 'coroutine' });
    });
    expectOnly(errors, /edge iterator -> coroutine: unknown concept coroutine/);
  });

  it('fails a goal that names a concept the map does not have', () => {
    const errors = lintBroken((map) => {
      map.goal.conceptIds = ['coroutine'];
    });
    expectAmong(errors, /goal: unknown concept coroutine/);
  });

  it('fails a module that teaches an assumed concept', () => {
    const errors = lintBroken((map) => {
      map.modules[0].conceptIds.push('function-call');
    });
    expectOnly(errors, /concept function-call: assumed concepts are not taught/);
  });

  it('fails a core concept that no module teaches', () => {
    const errors = lintBroken((map) => {
      map.modules[0].conceptIds = ['iterable'];
    });
    expectOnly(errors, /concept iterator: no module teaches it/);
  });

  it('fails two modules claiming the same order', () => {
    const errors = lintBroken((map) => {
      map.modules[1].order = 1;
    });
    expectAmong(errors, /module writing-generators: order 1 is already taken/);
  });
});
