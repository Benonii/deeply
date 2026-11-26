import { evaluateCase } from './evaluate';
import { listDisagreements, scoreResults } from './score';

import type { EvalReport, RunEvalInput } from './types';

async function mapWithConcurrency<Item, Result>(
  items: Item[],
  concurrency: number,
  work: (item: Item) => Promise<Result>
): Promise<Result[]> {
  const results: Result[] = new Array(items.length);
  let next = 0;
  const runWorker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, runWorker));
  return results;
}

export async function runEval({ target, cases, judge, concurrency, onResult }: RunEvalInput): Promise<EvalReport> {
  const startedAt = new Date().toISOString();
  const results = await mapWithConcurrency(cases, concurrency, async (prepared) => {
    const result = await evaluateCase(target, prepared, judge);
    onResult?.(result);
    return result;
  });
  return {
    checkId: target.check.checkId,
    checkVersion: target.check.version,
    judge: judge.name,
    knownLimit: target.knownLimit,
    startedAt,
    score: scoreResults(results),
    costUSD: results.reduce((total, result) => total + (result.costUSD ?? 0), 0),
    disagreements: listDisagreements(results),
    results
  };
}
