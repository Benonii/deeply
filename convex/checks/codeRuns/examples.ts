import { writingGeneratorsModule } from '../../lib/fixtures/pythonGeneratorsModules';
import type { CodeRunReport } from '../submissionSchema';

const pythonRun: CodeRunReport = { block: 1, stdout: 'generator\n3\n[2, 1]\n' };

export const codeRunsExamples = {
  pack: writingGeneratorsModule,
  passing: [pythonRun, { block: 2, stdout: '3\n2\nfalse\n' }] satisfies CodeRunReport[],
  failingOutput: [pythonRun, { block: 2, stdout: '3\n2\ntrue\n' }] satisfies CodeRunReport[],
  failingError: [
    pythonRun,
    { block: 2, stdout: '', error: 'SyntaxError: Unexpected identifier' }
  ] satisfies CodeRunReport[],
  failingMissing: [pythonRun] satisfies CodeRunReport[]
};
