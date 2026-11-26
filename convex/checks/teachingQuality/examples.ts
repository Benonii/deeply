import { iteratorProtocolModule } from '../../lib/fixtures/pythonGeneratorsModules';
import type { TeachingScores } from '../submissionSchema';

export const teachingQualityExamples = {
  pack: iteratorProtocolModule,
  passing: {
    objectiveStated: 4,
    workedExample: 5,
    practice: 4,
    mistakeAddressed: 3,
    levelFits: 4
  } satisfies TeachingScores,
  flagging: {
    objectiveStated: 4,
    workedExample: 5,
    practice: 4,
    mistakeAddressed: 2,
    levelFits: 4,
    note: 'nothing names the mistake of calling next() twice and expecting the same item'
  } satisfies TeachingScores
};
