import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appendRunnerOutput, readErrorMessage, readLastLine } from './runnerOutput';
import { trimPyodideFrames } from './runnerOutput';

const TRACEBACK = [
  'Traceback (most recent call last):',
  '  File "<exec>", line 3, in <module>',
  "NameError: name 'total' is not defined",
  ''
].join('\n');

const RUNTIME_TRACEBACK = [
  'Traceback (most recent call last):',
  '  File "/lib/python314.zip/_pyodide/_base.py", line 619, in eval_code_async',
  '    await CodeRunner(',
  '    ...<10 lines>...',
  '    .run_async(globals, locals)',
  '  File "/lib/python314.zip/_pyodide/_base.py", line 420, in run_async',
  '    coroutine = eval(self.code, globals, locals)',
  '  File "<exec>", line 3, in <module>',
  "NameError: name 'total' is not defined"
].join('\n');

describe('runner output', () => {
  it('keeps every line a short run prints', () => {
    const collected = ['10\n', '20\n'].reduce(appendRunnerOutput, '');
    assert.equal(collected, '10\n20\n');
  });

  it('cuts off a run that prints without end, and says so once', () => {
    let collected = '';
    for (let line = 0; line < 5000; line += 1) collected = appendRunnerOutput(collected, 'spinning forever\n');
    assert.ok(collected.length < 21000);
    assert.equal(collected.split('[output cut off').length, 2);
  });

  it('reads the headline of a traceback', () => {
    assert.equal(readLastLine(TRACEBACK), "NameError: name 'total' is not defined");
    assert.equal(readLastLine('   \n\n'), '');
  });

  it('drops the frames inside the runtime, keeps the learner frame', () => {
    assert.equal(trimPyodideFrames(RUNTIME_TRACEBACK), TRACEBACK.trimEnd());
    assert.equal(trimPyodideFrames(TRACEBACK), TRACEBACK);
  });

  it('reads a message from anything thrown', () => {
    assert.equal(readErrorMessage(new TypeError('counter is not a function')), 'counter is not a function');
    assert.equal(readErrorMessage('plain string'), 'plain string');
  });
});
