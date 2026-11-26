import type { CodeRunEvent, CodeRunOutcome, CodeRunRequest, RunCodeBlockOptions, RunnableLanguage } from '../types';

const RUN_TIMEOUT_MILLISECONDS = 10000;
const BOOT_TIMEOUT_MILLISECONDS = 60000;
const RUN_TIMEOUT_LINE = 'Stopped after 10 seconds. Check for a loop that never ends, then run it again.';
const BOOT_TIMEOUT_LINE = 'The runtime did not load in a minute. Check your connection and run it again.';
const WORKER_LOST_LINE = 'The runner stopped unexpectedly. Run it again.';

interface LanguageRunner {
  worker: Worker;
  hasStarted: boolean;
}

const startWorker: Record<RunnableLanguage, () => Worker> = {
  python: () => new Worker(new URL('./pythonWorker.ts', import.meta.url), { type: 'module' }),
  javascript: () => new Worker(new URL('./javascriptWorker.ts', import.meta.url), { type: 'module' })
};

const runners = new Map<RunnableLanguage, LanguageRunner>();
const queues = new Map<RunnableLanguage, Promise<void>>();
let lastRunID = 0;

const readRunner = (language: RunnableLanguage): LanguageRunner => {
  const running = runners.get(language);
  if (running !== undefined) return running;
  const started: LanguageRunner = { worker: startWorker[language](), hasStarted: false };
  runners.set(language, started);
  return started;
};

const discardRunner = (language: RunnableLanguage) => {
  runners.get(language)?.worker.terminate();
  runners.delete(language);
};

export const isRuntimeReady = (language: RunnableLanguage): boolean => runners.get(language)?.hasStarted === true;

const postRun = ({ language, code, onStarted }: RunCodeBlockOptions): Promise<CodeRunOutcome> =>
  new Promise((resolve) => {
    const runner = readRunner(language);
    lastRunID += 1;
    const runID = lastRunID;
    const startedAt = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (outcome: CodeRunOutcome) => {
      clearTimeout(timer);
      runner.worker.removeEventListener('message', readEvent);
      runner.worker.removeEventListener('error', readWorkerLoss);
      resolve(outcome);
    };
    const abandon = (errorLine: string) => {
      discardRunner(language);
      settle({ kind: 'raised', stdout: '', stderr: '', errorLine, milliseconds: performance.now() - startedAt });
    };
    const armTimer = (milliseconds: number, errorLine: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => abandon(errorLine), milliseconds);
    };
    const readEvent = (event: MessageEvent<CodeRunEvent>) => {
      const message = event.data;
      if (message.kind === 'started') {
        runner.hasStarted = true;
        armTimer(RUN_TIMEOUT_MILLISECONDS, RUN_TIMEOUT_LINE);
        onStarted();
        return;
      }
      if (message.runID !== runID) return;
      const milliseconds = performance.now() - startedAt;
      if (message.kind === 'printed') {
        settle({ kind: 'printed', stdout: message.stdout, stderr: message.stderr, milliseconds });
        return;
      }
      settle({
        kind: 'raised',
        stdout: message.stdout,
        stderr: message.stderr,
        errorLine: message.errorLine,
        milliseconds
      });
    };
    const readWorkerLoss = () => abandon(WORKER_LOST_LINE);

    runner.worker.addEventListener('message', readEvent);
    runner.worker.addEventListener('error', readWorkerLoss);
    if (runner.hasStarted) armTimer(RUN_TIMEOUT_MILLISECONDS, RUN_TIMEOUT_LINE);
    else armTimer(BOOT_TIMEOUT_MILLISECONDS, BOOT_TIMEOUT_LINE);
    const request: CodeRunRequest = { kind: 'run', runID, code };
    runner.worker.postMessage(request);
  });

export const runCodeBlock = (options: RunCodeBlockOptions): Promise<CodeRunOutcome> => {
  const waiting = queues.get(options.language) ?? Promise.resolve();
  const outcome = waiting.then(() => postRun(options));
  queues.set(
    options.language,
    outcome.then(
      () => undefined,
      () => undefined
    )
  );
  return outcome;
};
