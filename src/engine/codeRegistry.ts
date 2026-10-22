import type { CodeRef } from './codeTypes';

export const allRefs: Record<string, CodeRef> = {};
export const lineMap: Record<string, (number | null)[]> = {};

export function registerRefs(refs: Record<string, CodeRef>, lines: Record<string, (number | null)[]> = {}) {
  Object.assign(allRefs, refs);
  Object.assign(lineMap, lines);
}
