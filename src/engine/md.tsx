import { readInlineTokens } from './inlineTokens';
import { TermMark } from './TermMark';

import type { InlineToken, MarkdownSegment } from '../types';

function InlineBit({ token }: { token: InlineToken }) {
  switch (token.kind) {
    case 'code':
      return <code className="ic">{token.text}</code>;
    case 'term':
      return <TermMark termId={token.termId} display={token.text} />;
    case 'citation':
      return (
        <sup className="cite-mark" aria-hidden>
          ◦
        </sup>
      );
    case 'bold':
      return <strong>{token.text}</strong>;
    case 'emphasis':
      return <em>{token.text}</em>;
    case 'link':
      return (
        <a href={token.href} target="_blank" rel="noreferrer">
          {token.text}
        </a>
      );
    default:
      return <>{token.text}</>;
  }
}

export function Inline({ text }: { text: string }) {
  return (
    <>
      {readInlineTokens(text).map((token, index) => (
        <InlineBit key={index} token={token} />
      ))}
    </>
  );
}

const FENCED_CODE = /```([\w-]*)[ \t]*\n?([\s\S]*?)(?:```|$)/g;

function splitFencedCode(text: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(FENCED_CODE)) {
    if (match.index > last) segments.push({ kind: 'prose', text: text.slice(last, match.index) });
    segments.push({ kind: 'code', text: match[2].replace(/\s+$/, '') });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: 'prose', text: text.slice(last) });
  return segments;
}

export function Markdown({ text }: { text: string }) {
  return (
    <>
      {splitFencedCode(text).map((segment, segmentIndex) =>
        segment.kind === 'code' ? (
          <pre key={segmentIndex} className="md-code">
            <code>{segment.text}</code>
          </pre>
        ) : (
          <Prose key={segmentIndex} text={segment.text} />
        )
      )}
    </>
  );
}

function Prose({ text }: { text: string }) {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .filter((block) => block.trim());
  return (
    <>
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length && lines.every((line) => /^[-*•] /.test(line)))
          return (
            <ul key={blockIndex}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  <Inline text={line.replace(/^[-*•] /, '')} />
                </li>
              ))}
            </ul>
          );
        if (lines.length && lines.every((line) => /^\d+[.)] /.test(line)))
          return (
            <ol key={blockIndex}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  <Inline text={line.replace(/^\d+[.)] /, '')} />
                </li>
              ))}
            </ol>
          );
        return (
          <p key={blockIndex}>
            <Inline text={lines.join(' ')} />
          </p>
        );
      })}
    </>
  );
}
