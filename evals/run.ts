import { mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { findTarget, loadCalibration } from './calibration';
import { createClaudeJudge } from './judges';
import { formatReport } from './report';
import { runEval } from './runEval';

import type { CaseResult, EvalReport, RunOptions } from './types';

const REPORT_FOLDER = new URL('./reports/', import.meta.url);

const DEFAULT_CONCURRENCY = 4;

const USAGE = 'usage: npm run eval -- <check> [--model name] [--limit n] [--concurrency n]';

function readPositiveInteger(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name} must be a whole number above 0`);
  return parsed;
}

function readOptions(): RunOptions {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { model: { type: 'string' }, limit: { type: 'string' }, concurrency: { type: 'string' } }
  });
  const checkId = positionals[0];
  if (checkId === undefined) throw new Error(USAGE);
  return {
    checkId,
    model: values.model,
    limit: readPositiveInteger(values.limit, 'limit'),
    concurrency: readPositiveInteger(values.concurrency, 'concurrency') ?? DEFAULT_CONCURRENCY
  };
}

async function writeReportFile(report: EvalReport): Promise<string> {
  await mkdir(REPORT_FOLDER, { recursive: true });
  const stamp = report.startedAt.replace(/[:.]/g, '-');
  const file = new URL(`${report.checkId}-${stamp}.json`, REPORT_FOLDER);
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
  return file.pathname;
}

function createProgressPrinter(total: number): (result: CaseResult) => void {
  let done = 0;
  return (result) => {
    done += 1;
    const agreement = result.got === result.expected ? 'agree' : 'DISAGREE';
    process.stderr.write(
      `[${done}/${total}] ${result.id}: expected ${result.expected}, got ${result.got} ${agreement}\n`
    );
  };
}

async function main() {
  const options = readOptions();
  const target = findTarget(options.checkId);
  const allCases = await loadCalibration(target);
  const cases = allCases.slice(0, options.limit ?? allCases.length);
  const report = await runEval({
    target,
    cases,
    judge: createClaudeJudge(options.model),
    concurrency: options.concurrency,
    onResult: createProgressPrinter(cases.length)
  });
  const path = await writeReportFile(report);
  process.stdout.write(`${formatReport(report)}\n\nReport written to ${path}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
