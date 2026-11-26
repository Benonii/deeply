import { parseTermReferences } from '../../convex/lib/lessonLint';

import type { InlineToken } from '../types';

const INLINE =
  /(`[^`\n]+`)|(\[\[[^\]\n]+\]\])|(\[\^[A-Za-z0-9_-]+\])|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))/g;

function readToken(match: RegExpExecArray): InlineToken {
  const [token, code, termMark, citation, bold, emphasis, link, href] = match;
  if (code) return { kind: 'code', text: code.slice(1, -1) };
  if (termMark) {
    const [reference] = parseTermReferences(termMark);
    return { kind: 'term', termId: reference.id, text: reference.display };
  }
  if (citation) return { kind: 'citation', text: citation.slice(2, -1) };
  if (bold) return { kind: 'bold', text: bold.slice(2, -2) };
  if (emphasis) return { kind: 'emphasis', text: emphasis.slice(1, -1) };
  if (link) return { kind: 'link', text: link.slice(1, link.indexOf(']')), href };
  return { kind: 'text', text: token };
}

export function readInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text))) {
    if (match.index > last) tokens.push({ kind: 'text', text: text.slice(last, match.index) });
    tokens.push(readToken(match));
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) });
  return tokens;
}
