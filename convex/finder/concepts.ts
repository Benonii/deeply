import { finderThresholds } from './weights';
import type { ConceptRequest } from './types';

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

export function buildConceptKey({ topic, conceptName }: Pick<ConceptRequest, 'topic' | 'conceptName'>): string {
  return `${collapse(topic)}::${collapse(conceptName)}`;
}

export function buildSearchQueries(concept: ConceptRequest, supplied?: string[]): string[] {
  const chosen =
    supplied === undefined
      ? [`${concept.conceptName} explained`, `${concept.topic} ${concept.conceptName} tutorial`]
      : supplied;
  const seen = new Set<string>();
  return chosen
    .map((query) => query.replace(/\s+/g, ' ').trim())
    .filter((query) => {
      if (query.length === 0 || seen.has(query.toLowerCase())) return false;
      seen.add(query.toLowerCase());
      return true;
    })
    .slice(0, finderThresholds.maxSearchQueries);
}
