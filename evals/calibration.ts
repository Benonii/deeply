import { readFile } from 'node:fs/promises';

import { EVAL_TARGETS } from './targets';
import { CalibrationFile } from './validators';

import type { CheckID } from '../convex/checks/types';
import type { EvalTarget, PreparedCase } from './types';

export const CALIBRATION_FOLDER = new URL('./calibration/', import.meta.url);

export function listEvalCheckIDs(): CheckID[] {
  return Object.keys(EVAL_TARGETS) as CheckID[];
}

export function findTarget(checkId: string): EvalTarget {
  const target = EVAL_TARGETS[checkId as CheckID];
  if (target === undefined)
    throw new Error(
      `${checkId} is not an LLM check with a calibration set; pick one of ${listEvalCheckIDs().join(', ')}`
    );
  return target;
}

export function prepareCalibration(target: EvalTarget, raw: unknown): PreparedCase[] {
  const file = CalibrationFile.parse(raw);
  if (file.checkId !== target.check.checkId)
    throw new Error(`the calibration file is for ${file.checkId}, not ${target.check.checkId}`);
  const prepared = target.prepareCases(file.cases);
  const seen = new Set<string>();
  for (const { calibrationCase } of prepared) {
    if (seen.has(calibrationCase.id)) throw new Error(`case ${calibrationCase.id} appears twice`);
    seen.add(calibrationCase.id);
  }
  return prepared;
}

export async function loadCalibration(target: EvalTarget): Promise<PreparedCase[]> {
  const text = await readFile(new URL(`${target.check.checkId}.json`, CALIBRATION_FOLDER), 'utf8');
  return prepareCalibration(target, JSON.parse(text));
}
