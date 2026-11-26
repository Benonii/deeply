import type { CoursePack } from '../courseSchema';
import { pythonGeneratorsMap } from './pythonGeneratorsMap';
import { iteratorProtocolModule, writingGeneratorsModule } from './pythonGeneratorsModules';

export const pythonGeneratorsPack: CoursePack = {
  id: 'python-generators',
  schemaVersion: 2,
  title: 'Python generators, Deeply',
  tagline: 'How a function with yield in it becomes a cursor over data it never holds.',
  summary:
    'The iterator protocol behind every for loop, then generator functions and the lazy evaluation that lets you walk a file larger than memory.',
  kind: 'concept',
  brand: {
    name: 'Generators',
    colors: {
      bg: '#0a0a0b',
      surface: '#121214',
      surface2: '#1b1b1e',
      fg: '#f1f1f2',
      fg2: '#c9c9cd',
      muted: '#86868d',
      line: '#272729',
      accent: '#ffd43b',
      accent2: '#4b8bbe',
      accent3: '#8f8f97',
      onAccent: '#1a1a00'
    },
    fonts: { display: 'Inter', body: 'Inter', mono: 'JetBrains Mono' },
    source: 'designed'
  },
  challenges: [
    {
      id: 'c1',
      topic: 'iterators',
      difficulty: 1,
      type: 'predict',
      q: 'What does this print?',
      code: "walker = iter('ab')\nprint(next(walker), next(walker), sep='')\nprint(list(walker))",
      options: ['ab\n[]', 'ab\n[a, b]', 'a\n[b]'],
      answer: 0,
      explain: 'Both characters come out of the cursor, so list() on the exhausted cursor returns the empty list.',
      conceptId: 'iterator'
    },
    {
      id: 'c2',
      topic: 'generators',
      difficulty: 2,
      type: 'bug',
      q: 'This helper is meant to stream matching lines. Why does the caller always see nothing?',
      code: 'def matches(path, needle):\n    for line in open(path):\n        if needle in line:\n            return line\n\nfor hit in matches(path, "ERROR"):\n    print(hit)',
      options: [
        'return should be yield, so the function returns a generator instead of the first match',
        'open(path) is not iterable, so the for loop never starts',
        'needle in line is the wrong comparison for strings'
      ],
      answer: 0,
      explain:
        'With return the function hands back one string, and the caller then iterates that string character by character or over None. yield makes it a generator function.',
      conceptId: 'generator-function'
    }
  ],
  modules: [iteratorProtocolModule, writingGeneratorsModule]
};

export const pythonGeneratorsCourse = { map: pythonGeneratorsMap, pack: pythonGeneratorsPack };
