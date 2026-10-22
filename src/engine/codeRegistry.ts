import type { CodeRef } from './codeTypes';

/**
 * Source excerpts that diagrams can open. Each course registers its own refs
 * (and exact line maps) when it loads; the drawer looks ids up here.
 */
export const allRefs: Record<string, CodeRef> = {};
export const lineMap: Record<string, (number | null)[]> = {};

export function registerRefs(refs: Record<string, CodeRef>, lines: Record<string, (number | null)[]> = {}) {
  Object.assign(allRefs, refs);
  Object.assign(lineMap, lines);
}
