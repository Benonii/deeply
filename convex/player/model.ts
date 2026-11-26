import { findMissingAPIKey, selectModel } from '../lib/model';
import { fakeAskModel, fakeGradeModel, isPlayerFake } from './fakeModel';

function readModelID(): string | undefined {
  const configured = process.env.PLAYER_MODEL;
  return configured && configured.length > 0 ? configured : undefined;
}

function selectRealModel() {
  const missingKeyName = findMissingAPIKey();
  if (missingKeyName) throw new Error(`${missingKeyName} is not set on this deployment.`);
  return selectModel('low', readModelID());
}

export function selectAskModel() {
  if (isPlayerFake()) return { model: fakeAskModel(), providerOptions: undefined };
  return selectRealModel();
}

export function selectGradeModel() {
  if (isPlayerFake()) return { model: fakeGradeModel(), providerOptions: undefined };
  return selectRealModel();
}
