import { iteratorProtocolModule } from '../../lib/fixtures/pythonGeneratorsModules';
import { pythonGeneratorsPack } from '../../lib/fixtures/pythonGenerators';
import type { QuizAnswer } from '../submissionSchema';

export const answerKeysExamples = {
  pack: iteratorProtocolModule,
  challenges: pythonGeneratorsPack.challenges.filter((challenge) => challenge.conceptId === 'iterator'),
  passing: [
    { target: 'quiz', block: 1, chosen: 1 },
    { target: 'challenge', id: 'c1', chosen: 0 }
  ] satisfies QuizAnswer[],
  failingWrongKey: [
    { target: 'quiz', block: 1, chosen: 0 },
    { target: 'challenge', id: 'c1', chosen: 0 }
  ] satisfies QuizAnswer[],
  failingUnanswered: [{ target: 'quiz', block: 1, chosen: 1 }] satisfies QuizAnswer[]
};
