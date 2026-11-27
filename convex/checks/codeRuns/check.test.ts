import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pythonGeneratorsMap } from '../../lib/fixtures/pythonGeneratorsMap';
import { codeRunsCheck } from './check';
import { codeRunsExamples } from './examples';
import type { CodeRunReport } from '../submissionSchema';

const check = (codeRuns?: CodeRunReport[]) =>
  codeRunsCheck.run({ pack: codeRunsExamples.pack, map: pythonGeneratorsMap, submission: { codeRuns } });

describe('check 1, code runs', () => {
  it('passes when every runnable block printed what the lesson says it prints', async () => {
    const result = await check(codeRunsExamples.passing);
    assert.equal(result.pass, true);
    assert.deepEqual(result.problems, []);
    assert.equal(result.fixNote, '');
  });

  it('fails the block whose output differs, and names both outputs', async () => {
    const result = await check(codeRunsExamples.failingOutput);
    assert.equal(result.pass, false);
    assert.equal(result.problems.length, 1);
    assert.equal(result.fixNote, 'code block 2 prints "3\\n2\\ntrue\\n", lesson says "3\\n2\\nfalse\\n"');
  });

  it('ignores trailing whitespace and line endings', async () => {
    const result = await check([
      { block: 1, stdout: 'generator  \r\n3\r\n[2, 1]' },
      { block: 2, stdout: '3\n2\nfalse\n\n\n' }
    ]);
    assert.equal(result.pass, true);
  });

  it('fails a block that raised instead of running', async () => {
    const result = await check(codeRunsExamples.failingError);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /code block 2 raises "SyntaxError: Unexpected identifier"/);
  });

  it('fails a block nobody ran', async () => {
    const result = await check(codeRunsExamples.failingMissing);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /code block 2 was not run/);
  });

  it('fails when no runs were reported at all', async () => {
    const result = await check(undefined);
    assert.equal(result.pass, false);
    assert.match(result.fixNote, /run the 2 runnable code blocks/);
  });

  it('rejects a run reported for a block that does not exist', async () => {
    const result = await check([...codeRunsExamples.passing, { block: 7, stdout: '' }]);
    assert.equal(result.pass, false);
    assert.match(result.problems[0].message, /code block 7, which does not exist/);
  });
});
