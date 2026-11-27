import { listTextFields, mentionsPhrase } from '../moduleText';
import { orderThresholds } from './thresholds';
import type { ConceptMap } from '../../lib/conceptMapSchema';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem } from '../types';

function indexTeachingModules(map: ConceptMap): Map<string, { id: string; order: number }> {
  const teachers = new Map<string, { id: string; order: number }>();
  for (const plan of [...map.modules].sort((left, right) => left.order - right.order))
    for (const conceptId of plan.conceptIds)
      if (!teachers.has(conceptId)) teachers.set(conceptId, { id: plan.id, order: plan.order });
  return teachers;
}

function checkOrder({ pack, map }: CheckInput): CheckOutcome {
  const plan = map.modules.find((candidate) => candidate.id === pack.id);
  if (plan === undefined)
    return {
      pass: false,
      problems: [{ where: pack.id, message: 'the concept map has no module with this id' }],
      fixNote: `module ${pack.id} is not in the concept map, so nothing fixes its order; submit the map module it belongs to`
    };
  const teachers = indexTeachingModules(map);
  const fields = listTextFields(pack);
  const problems: CheckProblem[] = [];
  const notes: string[] = [];
  for (const concept of map.concepts) {
    const teacher = teachers.get(concept.id);
    if (teacher === undefined || teacher.order <= plan.order) continue;
    if (concept.name.length < orderThresholds.minimumNameLength) continue;
    if (orderThresholds.ignoredNames.includes(concept.name.toLowerCase())) continue;
    const field = fields.find((candidate) => mentionsPhrase(candidate.text, concept.name));
    if (field === undefined) continue;
    problems.push({
      where: field.where,
      message: `uses "${concept.name}", which module ${teacher.id} teaches later`
    });
    notes.push(
      `${field.where} names "${concept.name}" before module ${teacher.id} teaches it; cut the mention, or move ${concept.id} into an earlier module of the map`
    );
  }
  const ordersById = new Map(map.modules.map((candidate) => [candidate.id, candidate.order]));
  for (const term of pack.glossary ?? []) {
    if (term.taughtIn === undefined) continue;
    const taughtAt = ordersById.get(term.taughtIn);
    if (taughtAt === undefined || taughtAt <= plan.order) continue;
    problems.push({
      where: `${pack.id}/glossary ${term.id}`,
      message: `glossary term ${term.id} points at module ${term.taughtIn}, which comes later`
    });
    notes.push(
      `glossary term ${term.id} says it is taught in ${term.taughtIn}, which runs after this module; define it here or drop the mark`
    );
  }
  return { pass: problems.length === 0, problems, fixNote: notes.join('; ') };
}

export const orderCheck: CheckModule = {
  checkId: 'order',
  version: '1.0.0',
  stage: 'code',
  run: checkOrder
};
