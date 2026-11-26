import { appendRunnerOutput, readErrorMessage, readLastLine, trimPyodideFrames } from './runnerOutput';

import type { CodeRunEvent, CodeRunRequest, PyodideModule, PyodideRuntime } from '../types';

declare function postMessage(event: CodeRunEvent): void;

const PYODIDE_VERSION = '314.0.8';
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const LOAD_FAILED_LINE = 'Python did not load. Check your connection and run it again.';
const NO_MESSAGE_LINE = 'The code stopped without a message.';

let stdout = '';
let stderr = '';
let loadingRuntime: Promise<PyodideRuntime> | null = null;

function isPyodideModule(value: unknown): value is PyodideModule {
  return (
    typeof value === 'object' && value !== null && 'loadPyodide' in value && typeof value.loadPyodide === 'function'
  );
}

const loadRuntime = async (): Promise<PyodideRuntime> => {
  const moduleURL = new URL('pyodide.mjs', PYODIDE_BASE_URL).href;
  const loaded: unknown = await import(moduleURL);
  if (!isPyodideModule(loaded)) throw new Error('The Python runtime did not load from the CDN.');
  const runtime = await loaded.loadPyodide({ indexURL: PYODIDE_BASE_URL });
  runtime.setStdin({ error: true });
  runtime.setStdout({
    batched: (text) => {
      stdout = appendRunnerOutput(stdout, `${text}\n`);
    }
  });
  runtime.setStderr({
    batched: (text) => {
      stderr = appendRunnerOutput(stderr, `${text}\n`);
    }
  });
  return runtime;
};

const readRuntime = (): Promise<PyodideRuntime> => {
  if (loadingRuntime === null)
    loadingRuntime = loadRuntime().catch((error: unknown) => {
      loadingRuntime = null;
      throw error;
    });
  return loadingRuntime;
};

const runPython = async ({ runID, code }: CodeRunRequest) => {
  stdout = '';
  stderr = '';
  let runtime: PyodideRuntime;
  try {
    runtime = await readRuntime();
  } catch (error) {
    postMessage({ kind: 'raised', runID, stdout: '', stderr: readErrorMessage(error), errorLine: LOAD_FAILED_LINE });
    return;
  }
  postMessage({ kind: 'started' });
  try {
    await runtime.runPythonAsync(code, { globals: runtime.toPy({}) });
    postMessage({ kind: 'printed', runID, stdout, stderr });
  } catch (error) {
    const traceback = trimPyodideFrames(readErrorMessage(error));
    const lastLine = readLastLine(traceback);
    postMessage({
      kind: 'raised',
      runID,
      stdout,
      stderr: appendRunnerOutput(stderr, traceback),
      errorLine: lastLine === '' ? NO_MESSAGE_LINE : lastLine
    });
  }
};

addEventListener('message', (event: MessageEvent<CodeRunRequest>) => {
  void runPython(event.data);
});
