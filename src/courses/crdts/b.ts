import type { Block, Section } from '../../../convex/lib/courseSchema';

/* Tiny builders that keep the hand-written course readable. */

type FlowBlock = Extract<Block, { type: 'flow' }>;
type CalloutKind = Extract<Block, { type: 'callout' }>['kind'];

export const p = (text: string): Block => ({ type: 'p', text });
export const h3 = (text: string): Block => ({ type: 'h3', text });
export const ul = (...items: string[]): Block => ({ type: 'list', items });
export const ol = (...items: string[]): Block => ({ type: 'list', ordered: true, items });
export const callout = (kind: CalloutKind, title: string, text: string): Block => ({ type: 'callout', kind, title, text });
export const code = (lang: string, title: string, src: string, note?: string): Block => ({
  type: 'code',
  lang,
  title,
  code: src.replace(/^\n/, '').replace(/\s+$/, ''),
  ...(note ? { note } : {}),
});
export const terms = (...pairs: [string, string][]): Block => ({ type: 'keyterms', terms: pairs.map(([term, def]) => ({ term, def })) });
export const compare = (caption: string, head: string[], ...rows: string[][]): Block => ({ type: 'compare', caption, head, rows });
export const check = (q: string, options: string[], answer: number, explain: string): Block => ({ type: 'check', q, options, answer, explain });
export const flow = (f: Omit<FlowBlock, 'type'>): Block => ({ type: 'flow', ...f });
export const section = (id: string, title: string, ...blocks: Block[]): Section => ({ id, title, blocks });
