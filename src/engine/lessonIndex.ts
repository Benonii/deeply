import type { ModulePack } from '../../convex/lib/courseSchema';
import type { CourseConcept, ConceptStatus, LessonTerm } from '../types';
import type { MasteryRow } from '../../convex/lib/types';

interface IndexedModule {
  id: string;
  n: number;
  title: string;
  pack?: ModulePack;
}

export function readConceptName(conceptId: string) {
  return conceptId.replace(/-/g, ' ');
}

export function buildTermIndex(modules: IndexedModule[]): Map<string, LessonTerm> {
  const terms = new Map<string, LessonTerm>();
  const byModuleId = new Map(modules.map((courseModule) => [courseModule.id, courseModule]));
  for (const courseModule of modules)
    for (const term of courseModule.pack?.glossary ?? []) {
      if (terms.has(term.id)) continue;
      const owner = (term.taughtIn ? byModuleId.get(term.taughtIn) : undefined) ?? courseModule;
      terms.set(term.id, {
        id: term.id,
        term: term.term,
        definition: term.definition,
        moduleId: owner.id,
        moduleNumber: owner.n,
        moduleTitle: owner.title
      });
    }
  return terms;
}

export function listCourseConcepts(modules: IndexedModule[]): CourseConcept[] {
  const concepts: CourseConcept[] = [];
  const seen = new Set<string>();
  for (const courseModule of modules)
    for (const conceptId of courseModule.pack?.conceptIds ?? []) {
      if (seen.has(conceptId)) continue;
      seen.add(conceptId);
      const glossaryTerm = courseModule.pack?.glossary?.find((term) => term.id === conceptId);
      concepts.push({
        conceptId,
        name: glossaryTerm?.term ?? readConceptName(conceptId),
        moduleId: courseModule.id
      });
    }
  return concepts;
}

export function readConceptStatus(mastery: MasteryRow | undefined): ConceptStatus {
  if (!mastery) return 'untouched';
  return mastery.lastResult === 'pass' ? 'passed' : 'attempted';
}
