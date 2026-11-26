import type { Citation, TermReference } from './types';

export const TERM_MARK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export const CITATION_MARK = /\[\^([a-z0-9]+(?:-[a-z0-9]+)*)\]/g;

export function parseTermReferences(text: string): TermReference[] {
  return [...text.matchAll(TERM_MARK)].map((match) => ({
    id: match[1].trim(),
    display: (match[2] ?? match[1]).trim()
  }));
}

export function parseCitations(text: string): Citation[] {
  return [...text.matchAll(CITATION_MARK)].map((match) => ({ sourceId: match[1] }));
}
