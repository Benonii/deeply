import { z } from 'zod';

import { internal } from '../_generated/api';
import { ConceptMap } from '../lib/conceptMapSchema';
import { ModulePack } from '../lib/courseSchema';

import type { EngineStateView } from '../lib/types';
import type { AgentToolContext } from './types';
import type { EarlierModule } from './moduleBrief';

export const UNKNOWN_REQUEST =
  'No course request with that id for this key. Call list_course_requests to see the ones you own.';

export const NO_MAP = 'No concept map for this request yet. Call submit_concept_map first.';

export type MappedState =
  | { kind: 'mapped'; state: EngineStateView; map: ConceptMap }
  | { kind: 'failed'; message: string };

export async function readEngineState(
  { actionContext, userId }: AgentToolContext,
  requestId: string
): Promise<EngineStateView | null> {
  return await actionContext.runQuery(internal.courseBuilds.readState, { ownerId: userId, requestId });
}

export async function readMappedState(context: AgentToolContext, requestId: string): Promise<MappedState> {
  const state = await readEngineState(context, requestId);
  if (!state) return { kind: 'failed', message: UNKNOWN_REQUEST };
  if (state.map === null) return { kind: 'failed', message: NO_MAP };
  const parsed = ConceptMap.safeParse(state.map);
  if (!parsed.success)
    return {
      kind: 'failed',
      message: `The stored concept map no longer matches the schema. Send it again with submit_concept_map.\n\n${z.prettifyError(parsed.error)}`
    };
  return { kind: 'mapped', state, map: parsed.data };
}

export async function listEarlierModules(
  { actionContext, userId }: AgentToolContext,
  requestId: string,
  map: ConceptMap,
  order: number
): Promise<EarlierModule[]> {
  const plans = map.modules.filter((plan) => plan.order < order).sort((left, right) => left.order - right.order);
  if (plans.length === 0) return [];
  const packs: unknown[] = await actionContext.runQuery(internal.courseBuilds.readModulePacks, {
    ownerId: userId,
    requestId
  });
  const earlier: EarlierModule[] = [];
  for (const plan of plans) {
    const parsed = ModulePack.safeParse(packs.find((pack) => readPackId(pack) === plan.id));
    if (parsed.success) earlier.push({ plan, pack: parsed.data });
  }
  return earlier;
}

function readPackId(pack: unknown): string | null {
  if (pack === null || typeof pack !== 'object' || !('id' in pack)) return null;
  const { id } = pack;
  return typeof id === 'string' ? id : null;
}
