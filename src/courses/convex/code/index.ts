import { registerRefs } from '../../../engine/codeRegistry';
import type { CodeRef } from '../../../engine/codeTypes';
import { backendRefs } from './backend';
import { clientRefs } from './client';
import lines from './lines.json';

export const allRefs: Record<string, CodeRef> = { ...clientRefs, ...backendRefs };
registerRefs(allRefs, lines as Record<string, (number | null)[]>);
