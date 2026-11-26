import type { ModulePack } from '../courseSchema';

export const iteratorProtocolModule: ModulePack = {
  id: 'iterator-protocol',
  n: 1,
  title: 'The iterator protocol',
  kicker: 'What a for loop actually calls',
  minutes: 10,
  summary:
    'A for loop is sugar over two calls: iter() to get a cursor, then next() until the cursor says it is empty. Once you can trace those calls, generators stop being magic.',
  schemaVersion: 2,
  conceptIds: ['iterable', 'iterator'],
  glossary: [
    { id: 'iterable', term: 'iterable', definition: 'An object you can hand to iter() to get an iterator over it.' },
    {
      id: 'iterator',
      term: 'iterator',
      definition: 'An object whose __next__() method returns the next item in a stream.'
    },
    {
      id: 'stopiteration',
      term: 'StopIteration',
      definition: 'The exception an iterator raises to say it has no items left.'
    }
  ],
  sections: [
    {
      id: 'two-calls',
      title: 'Two calls, not one',
      conceptIds: ['iterable'],
      blocks: [
        {
          type: 'p',
          text: 'Lists, dicts, files and ranges are all [[iterable|iterables]]. None of them is the thing a for loop steps through. The loop first calls iter() on the iterable to get a separate cursor object, then calls next() on that cursor over and over. Writing both calls out by hand shows the whole protocol.'
        },
        {
          type: 'code',
          title: 'The for loop, unrolled',
          lang: 'python',
          runnable: 'python',
          code: "numbers = [10, 20, 30]\nwalker = iter(numbers)\nprint(next(walker))\nprint(next(walker))\nprint(next(walker))\ntry:\n    next(walker)\nexcept StopIteration:\n    print('exhausted')",
          expectedOutput: '10\n20\n30\nexhausted\n',
          note: 'A for loop runs exactly these calls and swallows the final exception.'
        },
        {
          type: 'callout',
          kind: 'insight',
          title: 'The list never moves',
          text: 'The list holds no position. The cursor does. That is why two for loops over the same list both start at the beginning, and why two next() calls on the same cursor do not.'
        }
      ]
    },
    {
      id: 'running-out',
      title: 'How a stream says it is empty',
      conceptIds: ['iterator'],
      blocks: [
        {
          type: 'p',
          text: 'An [[iterator]] has no length and no way to peek ahead. It reports the end by raising [[stopiteration|StopIteration]] from next(). Every loop, comprehension and unpacking in Python is built on catching that one exception, which is why an exhausted cursor keeps raising it instead of restarting.'
        },
        {
          type: 'check',
          q: 'You call list(walker) on a cursor that has already yielded all three items. What comes back?',
          options: ['[10, 20, 30]', '[]', 'A StopIteration exception', 'None'],
          answer: 1,
          explain:
            'list() calls next() once, gets StopIteration straight away, and returns the empty list it has built so far. Exhaustion is permanent for that cursor.',
          conceptId: 'iterator'
        },
        {
          type: 'explainback',
          conceptId: 'iterator',
          prompt:
            'A colleague says "a list is an iterator". In your own words, say what is wrong with that and what a list is instead.',
          rubric: [
            'Names the list as an iterable, not an iterator',
            'Says iter() produces a separate cursor object',
            'Says the cursor, not the list, holds the position'
          ]
        }
      ]
    }
  ]
};

export const writingGeneratorsModule: ModulePack = {
  id: 'writing-generators',
  n: 2,
  title: 'Writing generators',
  kicker: 'yield turns a function into a cursor',
  minutes: 12,
  summary:
    'A function with yield in it returns an iterator instead of a value. Calling next() runs the body up to the next yield and freezes it there, which is what keeps memory flat when the data does not fit.',
  schemaVersion: 2,
  conceptIds: ['generator-function', 'lazy-evaluation'],
  glossary: [
    {
      id: 'yield',
      term: 'yield',
      definition: 'The keyword that hands a value to the caller and suspends the function until the next next() call.'
    },
    {
      id: 'generator-function',
      term: 'generator function',
      definition: 'A function containing yield, which returns a generator object when called.'
    },
    {
      id: 'generator-object',
      term: 'generator object',
      definition: 'The iterator a generator function returns, which runs the function body one yield at a time.'
    }
  ],
  sections: [
    {
      id: 'yield-suspends',
      title: 'yield suspends, return ends',
      conceptIds: ['generator-function'],
      blocks: [
        {
          type: 'p',
          text: 'Put [[yield]] anywhere in a function body and the function changes kind. Calling it now runs none of the body. It builds a [[generator-object|generator object]], which is an [[iterator]], and hands that back. The body only moves when something calls next() on it.'
        },
        {
          type: 'code',
          title: 'Calling a generator function runs nothing',
          lang: 'python',
          runnable: 'python',
          code: 'def countdown(start):\n    while start > 0:\n        yield start\n        start -= 1\n\ncounter = countdown(3)\nprint(type(counter).__name__)\nprint(next(counter))\nprint(list(counter))',
          expectedOutput: 'generator\n3\n[2, 1]\n',
          note: 'list(counter) drains what is left, so the 3 is already gone.'
        },
        {
          type: 'code',
          title: 'The same shape in JavaScript',
          lang: 'javascript',
          runnable: 'javascript',
          code: 'function* countdown(start) {\n  for (let value = start; value > 0; value -= 1) yield value;\n}\nconst counter = countdown(3);\nconsole.log(counter.next().value);\nconsole.log(counter.next().value);\nconsole.log(counter.next().done);',
          expectedOutput: '3\n2\nfalse\n',
          note: 'done stays false until a next() call runs off the end of the body.'
        },
        {
          type: 'check',
          q: 'What does calling countdown(3) print, before any next() call?',
          options: [
            'Nothing, because no line of the body has run yet',
            '3, because the first yield runs eagerly',
            'Nothing, because yield writes to stderr'
          ],
          answer: 0,
          explain:
            'Calling a [[generator-function|generator function]] only constructs the generator object. The body is frozen at the top until the first next().',
          conceptId: 'generator-function'
        }
      ]
    },
    {
      id: 'why-memory-stays-flat',
      title: 'Why memory stays flat',
      conceptIds: ['lazy-evaluation'],
      blocks: [
        {
          type: 'p',
          text: 'Returning a list of a million lines costs a million lines of memory. Yielding them one at a time costs one line plus the frozen frame. That is the whole reason to reach for a generator over a list comprehension when you are reading a file you did not write.'
        },
        {
          type: 'video',
          youtubeId: 'Bzfu83LiEZs',
          title: 'Python GENERATORS & using Yield keyword',
          channel: 'Programming and Math Tutorials',
          startSec: 10,
          endSec: 120,
          conceptId: 'generator-function'
        },
        {
          type: 'article',
          url: 'https://docs.python.org/3/howto/functional.html',
          title: 'Functional Programming HOWTO',
          site: 'docs.python.org',
          conceptId: 'lazy-evaluation',
          minutes: 25
        },
        {
          type: 'check',
          q: 'Which version reads a 40 GB log file without running out of memory?',
          options: [
            'lines = [line for line in open(path)]',
            'lines = (line for line in open(path))',
            'lines = list(open(path).readlines())'
          ],
          answer: 1,
          explain:
            'The parentheses make a generator expression, so each line is produced on demand. Both other versions materialise every line first.',
          conceptId: 'lazy-evaluation'
        },
        {
          type: 'explainback',
          conceptId: 'lazy-evaluation',
          prompt:
            'You replaced a list comprehension with a generator expression and memory use dropped. Explain where the memory went, and name one thing you gave up.',
          rubric: [
            'Says values are produced on demand rather than stored',
            'Names the frozen frame or single in-flight value as the remaining cost',
            'Names a real loss such as no len(), no indexing, or single use only'
          ]
        }
      ]
    }
  ]
};
