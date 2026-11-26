import { iteratorProtocolModule } from '../../lib/fixtures/pythonGeneratorsModules';
import { loadThresholds } from './thresholds';
import type { ModulePack } from '../../lib/courseSchema';

const filler = `The cursor holds the position and the list holds the items. `.repeat(
  Math.ceil(loadThresholds.maxWordsPerSection / 6)
);

export const loadExamples = {
  passing: iteratorProtocolModule,
  failingTooManyConcepts: {
    ...iteratorProtocolModule,
    conceptIds: ['iterable', 'iterator', 'generator-function', 'lazy-evaluation']
  } satisfies ModulePack,
  failingTooLongSection: {
    ...iteratorProtocolModule,
    sections: iteratorProtocolModule.sections.map((section, index) =>
      index === 0 ? { ...section, blocks: [...section.blocks, { type: 'p' as const, text: filler }] } : section
    )
  } satisfies ModulePack
};
