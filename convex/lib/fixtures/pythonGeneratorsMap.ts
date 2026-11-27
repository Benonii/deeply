import type { ConceptMap } from '../conceptMapSchema';

export const pythonGeneratorsMap: ConceptMap = {
  schemaVersion: 2,
  goal: {
    text: 'Stream a log file line by line with a generator, so memory use stays flat however large the file gets.',
    conceptIds: ['generator-function', 'lazy-evaluation']
  },
  concepts: [
    {
      id: 'function-call',
      name: 'function call',
      definition: 'Running a function by naming it with parentheses and arguments.',
      role: 'assumed',
      sourceIds: []
    },
    {
      id: 'iterable',
      name: 'iterable',
      definition: 'An object you can hand to iter() to get an iterator over its members.',
      role: 'supporting',
      sourceIds: ['py-glossary']
    },
    {
      id: 'iterator',
      name: 'iterator',
      definition:
        'An object that returns the next item of a stream on each next() call and raises StopIteration at the end.',
      role: 'core',
      sourceIds: ['py-glossary']
    },
    {
      id: 'generator-function',
      name: 'generator function',
      definition: 'A function containing yield, which returns a generator object when you call it.',
      role: 'core',
      sourceIds: ['py-glossary', 'py-functional-howto']
    },
    {
      id: 'lazy-evaluation',
      name: 'lazy evaluation',
      definition: 'Computing each value only when a consumer asks for it, instead of building every value up front.',
      role: 'core',
      sourceIds: ['py-functional-howto']
    }
  ],
  edges: [
    { from: 'iterable', to: 'iterator' },
    { from: 'iterator', to: 'generator-function' },
    { from: 'function-call', to: 'generator-function' },
    { from: 'generator-function', to: 'lazy-evaluation' }
  ],
  modules: [
    {
      id: 'iterator-protocol',
      order: 1,
      conceptIds: ['iterable', 'iterator'],
      objective: {
        verb: 'trace',
        object: 'the iter() and next() calls a for loop makes',
        context: 'walking a list in CPython'
      }
    },
    {
      id: 'writing-generators',
      order: 2,
      conceptIds: ['generator-function', 'lazy-evaluation'],
      objective: {
        verb: 'write',
        object: 'a generator that streams a file line by line',
        context: 'where the file does not fit in memory'
      }
    }
  ],
  sources: [
    {
      id: 'py-glossary',
      url: 'https://docs.python.org/3/glossary.html',
      title: 'Python 3 glossary',
      tier: 1,
      claims: [
        {
          quote: 'An object capable of returning its members one at a time.',
          url: 'https://docs.python.org/3/glossary.html#term-iterable',
          conceptId: 'iterable'
        },
        {
          quote: 'When no more data are available a StopIteration exception is raised instead.',
          url: 'https://docs.python.org/3/glossary.html#term-iterator',
          conceptId: 'iterator'
        },
        {
          quote: 'A function which returns a generator object.',
          url: 'https://docs.python.org/3/glossary.html#term-generator-function',
          conceptId: 'generator-function'
        }
      ]
    },
    {
      id: 'py-functional-howto',
      url: 'https://docs.python.org/3/howto/functional.html',
      title: 'Functional Programming HOWTO',
      tier: 1,
      claims: [
        {
          quote:
            'Generator expressions return an iterator that computes the values as necessary, not needing to materialize all the values at once.',
          url: 'https://docs.python.org/3/howto/functional.html',
          conceptId: 'lazy-evaluation'
        }
      ]
    }
  ]
};
