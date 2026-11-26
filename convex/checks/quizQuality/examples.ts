import { iteratorProtocolModule } from '../../lib/fixtures/pythonGeneratorsModules';
import type { ModulePack } from '../../lib/courseSchema';
import type { QuizDistractorVerdict } from '../submissionSchema';

const withQuizOptions = (options: string[]): ModulePack => ({
  ...iteratorProtocolModule,
  sections: iteratorProtocolModule.sections.map((section) => ({
    ...section,
    blocks: section.blocks.map((block) => (block.type === 'check' ? { ...block, options } : block))
  }))
});

export const quizQualityExamples = {
  passing: iteratorProtocolModule,
  failingDuplicateOptions: withQuizOptions(['[10, 20, 30]', '[]', '[]', 'None']),
  failingTooFewOptions: withQuizOptions(['[10, 20, 30]', '[]']),
  passingVerdicts: [{ block: 1, hasMistakeBasedOptions: true }] satisfies QuizDistractorVerdict[],
  failingVerdicts: [
    {
      block: 1,
      hasMistakeBasedOptions: false,
      note: 'option D "None" is a category error, nobody reaches it from a real misreading'
    }
  ] satisfies QuizDistractorVerdict[]
};
