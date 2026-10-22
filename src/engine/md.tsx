import React from 'react';

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))/g;

export function Inline({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let keyCounter = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const [token, code, bold, emphasis, link, href] = match;
    if (code)
      out.push(
        <code key={keyCounter++} className="ic">
          {code.slice(1, -1)}
        </code>
      );
    else if (bold) out.push(<strong key={keyCounter++}>{bold.slice(2, -2)}</strong>);
    else if (emphasis) out.push(<em key={keyCounter++}>{emphasis.slice(1, -1)}</em>);
    else if (link)
      out.push(
        <a key={keyCounter++} href={href} target="_blank" rel="noreferrer">
          {link.slice(1, link.indexOf(']'))}
        </a>
      );
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
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
