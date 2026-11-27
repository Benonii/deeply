import { iteratorProtocolModule } from '../../lib/fixtures/pythonGeneratorsModules';
import type { ColdReaderWord } from '../submissionSchema';
import type { ModulePack } from '../../lib/courseSchema';

export const jargonExamples = {
  pack: iteratorProtocolModule,
  definedButUnmarkedPack: {
    ...iteratorProtocolModule,
    glossary: [
      ...(iteratorProtocolModule.glossary ?? []),
      { id: 'cursor', term: 'cursor', definition: 'The object that holds the position in a stream.' }
    ]
  } satisfies ModulePack,
  passing: [
    { word: 'iterables', where: 'two-calls' },
    { word: 'iterator', where: 'running-out' },
    { word: 'StopIteration', where: 'running-out' },
    { word: 'Python', where: 'running-out' }
  ] satisfies ColdReaderWord[],
  failingUndefined: [
    { word: 'iterator', where: 'running-out' },
    { word: 'comprehension', where: 'running-out' }
  ] satisfies ColdReaderWord[],
  failingUnmarked: [{ word: 'cursor', where: 'two-calls' }] satisfies ColdReaderWord[]
};
