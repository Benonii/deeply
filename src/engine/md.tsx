import React from 'react';

/**
 * Markdown-lite for pack and simplified text: **bold**, *italic*, `code`,
 * [links](https://…). Builds React nodes directly; never uses innerHTML.
 */
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))/g;

export function Inline({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [tok, code, bold, em, link, href] = m;
    if (code) out.push(<code key={k++} className="ic">{code.slice(1, -1)}</code>);
    else if (bold) out.push(<strong key={k++}>{bold.slice(2, -2)}</strong>);
    else if (em) out.push(<em key={k++}>{em.slice(1, -1)}</em>);
    else if (link) out.push(<a key={k++} href={href} target="_blank" rel="noreferrer">{link.slice(1, link.indexOf(']'))}</a>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** Paragraphs, and "- " / "1. " lists, separated by blank lines. */
export function Md({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length && lines.every((l) => /^[-*•] /.test(l)))
          return <ul key={i}>{lines.map((l, j) => <li key={j}><Inline text={l.replace(/^[-*•] /, '')} /></li>)}</ul>;
        if (lines.length && lines.every((l) => /^\d+[.)] /.test(l)))
          return <ol key={i}>{lines.map((l, j) => <li key={j}><Inline text={l.replace(/^\d+[.)] /, '')} /></li>)}</ol>;
        return <p key={i}><Inline text={lines.join(' ')} /></p>;
      })}
    </>
  );
}
