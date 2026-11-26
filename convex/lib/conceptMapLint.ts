import { BANNED_OBJECTIVE_VERBS } from './conceptMapSchema';
import type { Concept, ConceptMap } from './conceptMapSchema';

export const MAX_NEW_CONCEPTS_PER_MODULE = 3;

type ConceptMapRule = (map: ConceptMap) => string[];

function indexConceptsById(map: ConceptMap): Map<string, Concept> {
  return new Map(map.concepts.map((concept) => [concept.id, concept]));
}

function listModulesInOrder(map: ConceptMap): ConceptMap['modules'] {
  return [...map.modules].sort((left, right) => left.order - right.order);
}

function indexTeachingPositions(map: ConceptMap): Map<string, number> {
  const positions = new Map<string, number>();
  for (const plan of listModulesInOrder(map))
    for (const conceptId of plan.conceptIds) if (!positions.has(conceptId)) positions.set(conceptId, positions.size);
  return positions;
}

function indexDependents(map: ConceptMap): Map<string, string[]> {
  const dependents = new Map<string, string[]>();
  for (const edge of map.edges) dependents.set(edge.from, [...(dependents.get(edge.from) ?? []), edge.to]);
  return dependents;
}

function findDuplicateIds(map: ConceptMap): string[] {
  const errors: string[] = [];
  const report = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label}: duplicate id ${id}`);
      seen.add(id);
    }
  };
  report(
    'concepts',
    map.concepts.map((concept) => concept.id)
  );
  report(
    'sources',
    map.sources.map((source) => source.id)
  );
  report(
    'modules',
    map.modules.map((plan) => plan.id)
  );
  const orders = new Set<number>();
  for (const plan of map.modules) {
    if (orders.has(plan.order)) errors.push(`module ${plan.id}: order ${plan.order} is already taken`);
    orders.add(plan.order);
  }
  return errors;
}

function findUnknownReferences(map: ConceptMap): string[] {
  const conceptsById = indexConceptsById(map);
  const errors: string[] = [];
  for (const edge of map.edges) {
    if (!conceptsById.has(edge.from)) errors.push(`edge ${edge.from} -> ${edge.to}: unknown concept ${edge.from}`);
    if (!conceptsById.has(edge.to)) errors.push(`edge ${edge.from} -> ${edge.to}: unknown concept ${edge.to}`);
  }
  for (const plan of map.modules)
    for (const conceptId of plan.conceptIds)
      if (!conceptsById.has(conceptId)) errors.push(`module ${plan.id}: unknown concept ${conceptId}`);
  for (const conceptId of map.goal.conceptIds)
    if (!conceptsById.has(conceptId)) errors.push(`goal: unknown concept ${conceptId}`);
  return errors;
}

function findTeachingErrors(map: ConceptMap): string[] {
  const errors: string[] = [];
  const teachers = new Map<string, string[]>();
  for (const plan of map.modules)
    for (const conceptId of plan.conceptIds) teachers.set(conceptId, [...(teachers.get(conceptId) ?? []), plan.id]);
  for (const concept of map.concepts) {
    const taughtBy = teachers.get(concept.id) ?? [];
    if (concept.role === 'assumed' && taughtBy.length > 0)
      errors.push(`concept ${concept.id}: assumed concepts are not taught, but module ${taughtBy[0]} teaches it`);
    if (concept.role !== 'assumed' && taughtBy.length === 0) errors.push(`concept ${concept.id}: no module teaches it`);
    if (taughtBy.length > 1) errors.push(`concept ${concept.id}: taught by ${taughtBy.join(' and ')}`);
  }
  return errors;
}

function findModuleLoadErrors(map: ConceptMap): string[] {
  return map.modules
    .filter((plan) => new Set(plan.conceptIds).size > MAX_NEW_CONCEPTS_PER_MODULE)
    .map(
      (plan) =>
        `module ${plan.id}: teaches ${new Set(plan.conceptIds).size} new concepts, at most ${MAX_NEW_CONCEPTS_PER_MODULE} allowed`
    );
}

function findCycles(map: ConceptMap): string[] {
  const dependents = indexDependents(map);
  const inProgress = new Set<string>();
  const finished = new Set<string>();
  const errors: string[] = [];
  const walk = (conceptId: string, path: string[]) => {
    if (finished.has(conceptId)) return;
    if (inProgress.has(conceptId)) {
      const loopStart = path.indexOf(conceptId);
      errors.push(`edges: prerequisite cycle ${[...path.slice(loopStart), conceptId].join(' -> ')}`);
      return;
    }
    inProgress.add(conceptId);
    for (const dependent of dependents.get(conceptId) ?? []) walk(dependent, [...path, conceptId]);
    inProgress.delete(conceptId);
    finished.add(conceptId);
  };
  for (const concept of map.concepts) walk(concept.id, []);
  return errors;
}

function findPrerequisiteOrderErrors(map: ConceptMap): string[] {
  const conceptsById = indexConceptsById(map);
  const positions = indexTeachingPositions(map);
  const errors: string[] = [];
  for (const edge of map.edges) {
    const prerequisite = conceptsById.get(edge.from);
    const dependent = conceptsById.get(edge.to);
    if (!prerequisite || !dependent) continue;
    if (dependent.role === 'assumed' && prerequisite.role !== 'assumed') {
      errors.push(`edge ${edge.from} -> ${edge.to}: ${edge.to} is assumed known, so its prerequisite cannot be taught`);
      continue;
    }
    if (prerequisite.role === 'assumed') continue;
    const prerequisitePosition = positions.get(edge.from);
    const dependentPosition = positions.get(edge.to);
    if (prerequisitePosition === undefined || dependentPosition === undefined) continue;
    if (prerequisitePosition >= dependentPosition)
      errors.push(`edge ${edge.from} -> ${edge.to}: prerequisite ${edge.from} is not taught before ${edge.to}`);
  }
  return errors;
}

function findUndefinedOrUnsourcedConcepts(map: ConceptMap): string[] {
  const sourceIds = new Set(map.sources.map((source) => source.id));
  const errors: string[] = [];
  for (const concept of map.concepts) {
    if (concept.definition.trim().length === 0) errors.push(`concept ${concept.id}: definition is blank`);
    if (concept.definition.includes('\n')) errors.push(`concept ${concept.id}: definition must be one line`);
    if (concept.role !== 'assumed' && concept.sourceIds.length === 0)
      errors.push(`concept ${concept.id}: no source backs it`);
    for (const sourceId of concept.sourceIds)
      if (!sourceIds.has(sourceId)) errors.push(`concept ${concept.id}: unknown source ${sourceId}`);
  }
  return errors;
}

function findDeadEnds(map: ConceptMap): string[] {
  const dependents = indexDependents(map);
  const reachesGoal = new Set(map.goal.conceptIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const concept of map.concepts) {
      if (reachesGoal.has(concept.id)) continue;
      if (!(dependents.get(concept.id) ?? []).some((dependent) => reachesGoal.has(dependent))) continue;
      reachesGoal.add(concept.id);
      grew = true;
    }
  }
  return map.concepts
    .filter((concept) => !reachesGoal.has(concept.id))
    .map((concept) => `concept ${concept.id}: nothing it leads to reaches the goal`);
}

function findBannedObjectiveVerbs(map: ConceptMap): string[] {
  return map.modules
    .filter((plan) => BANNED_OBJECTIVE_VERBS.includes(normalizeVerb(plan.objective.verb)))
    .map((plan) => `module ${plan.id}: objective verb "${plan.objective.verb}" names no observable action`);
}

export function normalizeVerb(verb: string): string {
  return (
    verb
      .trim()
      .toLowerCase()
      .split(/[\s,.;:]+/)[0] ?? ''
  );
}

const CONCEPT_MAP_RULES: ConceptMapRule[] = [
  findDuplicateIds,
  findUnknownReferences,
  findTeachingErrors,
  findModuleLoadErrors,
  findCycles,
  findPrerequisiteOrderErrors,
  findUndefinedOrUnsourcedConcepts,
  findDeadEnds,
  findBannedObjectiveVerbs
];

export function lintConceptMap(map: ConceptMap): string[] {
  return CONCEPT_MAP_RULES.flatMap((rule) => rule(map));
}
