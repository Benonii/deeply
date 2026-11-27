import { CHECK_REGISTRY } from './registry';
import type { CheckRegistration, CheckResult, CheckStage } from './types';
import type { CheckInput, ChecksRun, ModuleVerdict, RunChecksOptions } from './types';

export const MAX_RETRIES = 2;

export const STAGE_ORDER: CheckStage[] = ['code', 'network', 'agent'];

function describeFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runOne(registration: CheckRegistration, input: CheckInput): Promise<CheckResult> {
  const { check, mode } = registration;
  const stamp = { checkId: check.checkId, version: check.version, mode };
  try {
    return { ...stamp, ...(await check.run(input)) };
  } catch (error) {
    return {
      ...stamp,
      pass: false,
      problems: [{ where: check.checkId, message: `the check itself failed: ${describeFailure(error)}` }],
      fixNote: ''
    };
  }
}

export async function runChecks(input: CheckInput, options: RunChecksOptions = {}): Promise<ChecksRun> {
  const registry = options.registry ?? CHECK_REGISTRY;
  const stages = options.stages ?? STAGE_ORDER;
  const shouldRun = (registration: CheckRegistration) =>
    registration.mode !== 'off' && stages.includes(registration.check.stage);
  const ordered = STAGE_ORDER.filter((stage) => stages.includes(stage)).flatMap((stage) =>
    registry.filter((registration) => shouldRun(registration) && registration.check.stage === stage)
  );
  const results: CheckResult[] = [];
  for (const registration of ordered) results.push(await runOne(registration, input));
  return {
    results,
    skipped: registry
      .filter((registration) => !shouldRun(registration))
      .map((registration) => registration.check.checkId)
  };
}

export function listFixNotes(results: CheckResult[]): string[] {
  return results
    .filter((result) => result.mode === 'on' && !result.pass && result.fixNote.length > 0)
    .map((result) => `${result.checkId}: ${result.fixNote}`);
}

export function decideModuleFate({ results, attempt }: { results: CheckResult[]; attempt: number }): ModuleVerdict {
  const blocked = results.some((result) => result.mode === 'on' && !result.pass);
  if (!blocked) return { kind: 'pass' };
  const fixNotes = listFixNotes(results);
  if (attempt > MAX_RETRIES) return { kind: 'publish-unverified', fixNotes };
  return { kind: 'retry', nextAttempt: attempt + 1, fixNotes };
}
