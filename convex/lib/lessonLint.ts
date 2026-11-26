import { lintModule } from './courseSchema';
import { parseTermReferences } from './lessonMarks';
import type { CoursePack, ModulePack } from './courseSchema';
import type { ConceptMap } from './conceptMapSchema';
import type { LessonLintOptions } from './types';

const KEYS_HOLDING_SOURCE_CODE = new Set(['code']);

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value)
    .filter(([key]) => !KEYS_HOLDING_SOURCE_CODE.has(key))
    .flatMap(([, entry]) => collectStrings(entry));
}

function collectConceptIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectConceptIds);
  if (value === null || typeof value !== 'object') return [];
  const found: string[] = [];
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'conceptId' && typeof entry === 'string') found.push(entry);
    if (key === 'conceptIds' && Array.isArray(entry))
      found.push(...entry.filter((item): item is string => typeof item === 'string'));
    found.push(...collectConceptIds(entry));
  }
  return found;
}

function listConceptIdsAvailableTo(map: ConceptMap, moduleOrder: number): Set<string> {
  const available = new Set(map.concepts.filter((concept) => concept.role === 'assumed').map((concept) => concept.id));
  for (const plan of map.modules)
    if (plan.order <= moduleOrder) for (const conceptId of plan.conceptIds) available.add(conceptId);
  return available;
}

function lintGlossary(pack: ModulePack, map: ConceptMap): string[] {
  const moduleIds = new Set(map.modules.map((plan) => plan.id));
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const term of pack.glossary ?? []) {
    if (seen.has(term.id)) errors.push(`module ${pack.id}: duplicate glossary id ${term.id}`);
    seen.add(term.id);
    if (term.taughtIn !== undefined && !moduleIds.has(term.taughtIn))
      errors.push(`module ${pack.id}: glossary term ${term.id} is taughtIn unknown module ${term.taughtIn}`);
  }
  return errors;
}

function lintTermReferences(pack: ModulePack, termIdsTaughtEarlier: Set<string>): string[] {
  const defined = new Set([...termIdsTaughtEarlier, ...(pack.glossary ?? []).map((term) => term.id)]);
  const unresolved = new Set(
    collectStrings(pack)
      .flatMap(parseTermReferences)
      .map((reference) => reference.id)
      .filter((termId) => !defined.has(termId))
  );
  return [...unresolved].map((termId) => `module ${pack.id}: [[${termId}]] has no glossary entry`);
}

function lintConceptReferences(pack: ModulePack, map: ConceptMap): string[] {
  const plan = map.modules.find((candidate) => candidate.id === pack.id);
  if (!plan) return [`module ${pack.id}: the concept map has no module with this id`];
  const errors: string[] = [];
  if (pack.n !== plan.order) errors.push(`module ${pack.id}: n is ${pack.n}, the concept map says order ${plan.order}`);
  const taught = pack.conceptIds?.join(',');
  if (taught !== undefined && taught !== plan.conceptIds.join(','))
    errors.push(`module ${pack.id}: conceptIds [${taught}] do not match the concept map plan [${plan.conceptIds}]`);
  const known = new Set(map.concepts.map((concept) => concept.id));
  const available = listConceptIdsAvailableTo(map, plan.order);
  for (const conceptId of new Set(collectConceptIds(pack))) {
    if (!known.has(conceptId)) {
      errors.push(`module ${pack.id}: unknown concept ${conceptId}`);
      continue;
    }
    if (!available.has(conceptId))
      errors.push(`module ${pack.id}: uses concept ${conceptId} before the module that teaches it`);
  }
  return errors;
}

function lintBlocks(pack: ModulePack): string[] {
  const errors: string[] = [];
  for (const section of pack.sections)
    for (const block of section.blocks) {
      if (block.type === 'check' && block.conceptId === undefined)
        errors.push(`${pack.id}/${section.id}: check "${block.q}" has no conceptId`);
      if (block.type === 'video' && block.endSec <= block.startSec)
        errors.push(
          `${pack.id}/${section.id}: video ${block.youtubeId} ends at ${block.endSec}s, starts at ${block.startSec}s`
        );
    }
  return errors;
}

export function lintLessonV2(pack: ModulePack, map: ConceptMap, options: LessonLintOptions = {}): string[] {
  const errors = lintModule(pack, options.codeRefIds ?? new Set());
  if (pack.schemaVersion !== 2) errors.push(`module ${pack.id}: schemaVersion must be 2`);
  if (pack.conceptIds === undefined) errors.push(`module ${pack.id}: conceptIds is missing`);
  errors.push(...lintConceptReferences(pack, map));
  errors.push(...lintGlossary(pack, map));
  errors.push(...lintTermReferences(pack, options.termIdsTaughtEarlier ?? new Set()));
  errors.push(...lintBlocks(pack));
  return errors;
}

export function lintCourseV2(pack: CoursePack, map: ConceptMap): string[] {
  const errors: string[] = [];
  if (pack.schemaVersion !== 2) errors.push(`course ${pack.id}: schemaVersion must be 2`);
  const codeRefIds = new Set(Object.keys(pack.codeRefs ?? {}));
  const knownConceptIds = new Set(map.concepts.map((concept) => concept.id));
  const modulesById = new Map(pack.modules.map((coursePackModule) => [coursePackModule.id, coursePackModule]));
  const termIdsTaughtEarlier = new Set<string>();
  for (const plan of [...map.modules].sort((left, right) => left.order - right.order)) {
    const lesson = modulesById.get(plan.id);
    if (!lesson) {
      errors.push(`course ${pack.id}: no module written for ${plan.id}`);
      continue;
    }
    errors.push(...lintLessonV2(lesson, map, { termIdsTaughtEarlier, codeRefIds }));
    for (const term of lesson.glossary ?? []) termIdsTaughtEarlier.add(term.id);
  }
  const plannedIds = new Set(map.modules.map((plan) => plan.id));
  for (const lesson of pack.modules)
    if (!plannedIds.has(lesson.id)) errors.push(`course ${pack.id}: module ${lesson.id} is not in the concept map`);
  for (const challenge of pack.challenges) {
    if (challenge.conceptId === undefined) {
      errors.push(`challenge ${challenge.id}: has no conceptId`);
      continue;
    }
    if (!knownConceptIds.has(challenge.conceptId))
      errors.push(`challenge ${challenge.id}: unknown concept ${challenge.conceptId}`);
  }
  return errors;
}
