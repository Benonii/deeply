import { iteratorProtocolModule } from '../../lib/fixtures/pythonGeneratorsModules';
import type { ModulePack } from '../../lib/courseSchema';

export const orderExamples = {
  passing: iteratorProtocolModule,
  failingEarlyConcept: {
    ...iteratorProtocolModule,
    summary: `${iteratorProtocolModule.summary} Lazy evaluation is the reason any of this pays off.`
  } satisfies ModulePack,
  failingForwardTerm: {
    ...iteratorProtocolModule,
    glossary: [
      ...(iteratorProtocolModule.glossary ?? []),
      {
        id: 'yield',
        term: 'yield',
        definition: 'The keyword that hands a value to the caller and suspends the function.',
        taughtIn: 'writing-generators'
      }
    ]
  } satisfies ModulePack
};
