import { appendRunnerOutput } from './runnerOutput';

import type { CodeRunEvent, CodeRunRequest } from '../types';

declare function postMessage(event: CodeRunEvent): void;

let stdout = '';
let stderr = '';

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return `${value}n`;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

const formatValues = (values: unknown[]): string => `${values.map(formatValue).join(' ')}\n`;

const readThrownLine = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : `Uncaught ${formatValue(error)}`;

const writeStdout = (...values: unknown[]) => {
  stdout = appendRunnerOutput(stdout, formatValues(values));
};

const writeStderr = (...values: unknown[]) => {
  stderr = appendRunnerOutput(stderr, formatValues(values));
};

console.log = writeStdout;
console.info = writeStdout;
console.debug = writeStdout;
console.warn = writeStderr;
console.error = writeStderr;

const runJavaScript = async ({ runID, code }: CodeRunRequest) => {
  stdout = '';
  stderr = '';
  postMessage({ kind: 'started' });
  try {
    const block = new Function(`return (async () => {\n${code}\n})();`);
    await block();
    postMessage({ kind: 'printed', runID, stdout, stderr });
  } catch (error) {
    postMessage({ kind: 'raised', runID, stdout, stderr, errorLine: readThrownLine(error) });
  }
};

addEventListener('message', (event: MessageEvent<CodeRunRequest>) => {
  void runJavaScript(event.data);
});
