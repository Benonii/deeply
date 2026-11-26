import { iteratorProtocolModule } from '../../lib/fixtures/pythonGeneratorsModules';
import type { ModulePack } from '../../lib/courseSchema';
import type { FactualSentence } from '../submissionSchema';

const SENTENCE = 'An [[iterator]] raises [[stopiteration|StopIteration]] once it has no items left.';

const withSentence = (sentence: string): ModulePack => ({
  ...iteratorProtocolModule,
  sections: iteratorProtocolModule.sections.map((section) =>
    section.id !== 'running-out'
      ? section
      : {
          ...section,
          blocks: section.blocks.map((block) =>
            block.type === 'p' ? { ...block, text: `${block.text} ${sentence}` } : block
          )
        }
  )
});

export const factsCitedExamples = {
  citedPack: withSentence(`${SENTENCE} [^py-glossary]`),
  uncitedPack: withSentence(SENTENCE),
  unknownSourcePack: withSentence(`${SENTENCE} [^py-tutorial]`),
  passing: [
    { where: 'running-out', sentence: `${SENTENCE} [^py-glossary]`, verdict: 'supported' }
  ] satisfies FactualSentence[],
  failingUnsupported: [
    {
      where: 'running-out',
      sentence: `${SENTENCE} [^py-glossary]`,
      verdict: 'unsupported',
      note: 'the glossary quote is about returning members one at a time, not about the end of a stream'
    }
  ] satisfies FactualSentence[],
  failingUncited: [{ where: 'running-out', sentence: SENTENCE, verdict: 'supported' }] satisfies FactualSentence[],
  failingNotInLesson: [
    { where: 'running-out', sentence: 'An iterator can be rewound with reset(). [^py-glossary]', verdict: 'supported' }
  ] satisfies FactualSentence[]
};
