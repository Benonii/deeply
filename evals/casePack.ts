import type { ConceptMap, Source } from '../convex/lib/conceptMapSchema';
import type { Block, ModulePack, Section } from '../convex/lib/courseSchema';
import type { CaseMapInput, CasePackInput } from './types';

export const CASE_MODULE_ID = 'calibration-module';

export const CASE_CONCEPT_ID = 'case-concept';

export const CASE_SECTION_ID = 'lesson';

export function buildCaseSection(blocks: Block[]): Section {
  return { id: CASE_SECTION_ID, title: 'Lesson', conceptIds: [CASE_CONCEPT_ID], blocks };
}

export function buildCasePack({ topic, summary, sections, glossary }: CasePackInput): ModulePack {
  return {
    id: CASE_MODULE_ID,
    n: 1,
    title: topic,
    kicker: topic,
    minutes: 10,
    summary: summary ?? topic,
    schemaVersion: 2,
    conceptIds: [CASE_CONCEPT_ID],
    glossary: glossary ?? [],
    sections
  };
}

export function buildCaseMap({ topic, goal, sources }: CaseMapInput): ConceptMap {
  const caseSources = sources ?? [];
  return {
    schemaVersion: 2,
    goal: { text: goal ?? `Use ${topic} correctly in everyday work.`, conceptIds: [CASE_CONCEPT_ID] },
    concepts: [
      {
        id: CASE_CONCEPT_ID,
        name: topic,
        definition: `The idea this module teaches: ${topic}.`,
        role: 'core',
        sourceIds: caseSources.map((source) => source.id)
      }
    ],
    edges: [],
    modules: [
      {
        id: CASE_MODULE_ID,
        order: 1,
        conceptIds: [CASE_CONCEPT_ID],
        objective: { verb: 'apply', object: topic, context: 'in everyday work' }
      }
    ],
    sources: caseSources
  };
}

export function buildCaseSource(id: string, quote: string): Source {
  const url = `https://docs.example/${id}`;
  return { id, url, title: id, tier: 1, claims: [{ quote, url, conceptId: CASE_CONCEPT_ID }] };
}

export function stripAnswerKeys(pack: ModulePack): unknown {
  return {
    ...pack,
    sections: pack.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) =>
        block.type === 'check'
          ? { type: block.type, q: block.q, options: block.options, conceptId: block.conceptId }
          : block
      )
    }))
  };
}
