import React, { useEffect, useMemo, useState } from 'react';
import { buildPrompt, CopyBtn, highlight, registerCodeOpener } from './kit';
import { allRefs, lineMap } from './codeRegistry';
import { refUrl, type CodeRef } from './codeTypes';

export function CodeDrawer() {
  const [request, setRequest] = useState<{ ids: string[]; context: string } | null>(null);
  const [tab, setTab] = useState(0);
  useEffect(() => {
    registerCodeOpener((nextRequest) => { setRequest(nextRequest); setTab(0); });
    return () => registerCodeOpener(null);
  }, []);
  useEffect(() => {
    if (!request) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setRequest(null); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [request]);

  const refs = (request?.ids ?? []).map((id) => allRefs[id]).filter(Boolean) as CodeRef[];
  const ref = refs[tab];
  const open = !!request;
  return (
    <>
      <div className={`cd-scrim ${open ? 'open' : ''}`} onClick={() => setRequest(null)} />
      <aside className={`cd ${open ? 'open' : ''}`} aria-hidden={!open} role="dialog" aria-label="Source code">
        {request && (
          <>
            <div className="cd-head">
              <div className="cd-top">
                <span className="cd-ctx">Source · {request.context}</span>
                <button className="cd-close" onClick={() => setRequest(null)} aria-label="Close">✕</button>
              </div>
              {refs.length > 1 && (
                <div className="cd-tabs">
                  {refs.map((codeRef, index) => <button key={codeRef.id} className={index === tab ? 'on' : ''} onClick={() => setTab(index)}>{codeRef.symbol}</button>)}
                </div>
              )}
            </div>
            <div className="cd-body">
              {ref ? <RefView codeRef={ref} context={request.context} /> : <p className="cd-missing">No source excerpt mapped here yet.</p>}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function RefView({ codeRef: r, context }: { codeRef: CodeRef; context: string }) {
  const lines = useMemo(() => r.code.replace(/\s+$/, '').split('\n'), [r.code]);
  // Assign real file line numbers, resuming after each `// …` elision from
  // the next annotated or final line when possible.
  const numbered = useMemo(() => {
    const exact = lineMap[r.id];
    if (exact && exact.length === lines.length) return lines.map((line, index) => ({ l: line, n: exact[index] }));
    let lineNumber = r.startLine;
    const elisions = lines.filter((line) => line.trim() === '// …').length;
    const shown = lines.length - elisions;
    const gap = elisions ? Math.max(0, r.endLine - r.startLine + 1 - shown) : 0;
    const linesPerElision = elisions ? Math.floor(gap / elisions) : 0;
    return lines.map((line) => {
      if (line.trim() === '// …') { lineNumber += linesPerElision; return { l: line, n: null as number | null }; }
      return { l: line, n: lineNumber++ };
    });
  }, [lines, r.startLine, r.endLine]);
  const notes = new Map((r.notes ?? []).map((note) => [note.line, note.text]));
  const prompt = () =>
    buildPrompt(
      ['Convex source', context, r.symbol],
      `This is real code from ${r.repo.includes("/") ? r.repo : "get-convex/" + r.repo} (${r.path}, lines ${r.startLine}-${r.endLine}). In the course it is: ${r.summary}\n\nWalk me through it line by line, explain how it connects to the rest of the system, and what would break if it were written differently.\n\n\`\`\`${r.lang}\n${r.code}\n\`\`\``,
    );
  return (
    <>
      <div>
        <div className="cd-title">{r.title}</div>
        <div className="cd-path"><a href={refUrl(r)} target="_blank" rel="noreferrer">{r.repo}/{r.path}#L{r.startLine}-L{r.endLine}</a> · <code>{r.symbol}</code></div>
      </div>
      <p className="cd-summary">{r.summary}</p>
      <div className="cd-explain">{r.explain.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      <div className="cd-actions">
        <CopyBtn label="Copy & ask Claude" get={prompt} />
        <CopyBtn label="Raw code" title="Copy raw code" get={() => r.code} />
      </div>
      <div className="cd-code">
        <table>
          <tbody>
            {numbered.map(({ l, n }, index) => {
              const note = n !== null ? notes.get(n) : undefined;
              return (
                <React.Fragment key={index}>
                  <tr className={n === null ? 'elide' : note ? 'noted' : ''}>
                    <td className="ln">{n ?? '⋮'}</td>
                    <td>{n === null ? '// …' : highlight(l, r.lang)}</td>
                  </tr>
                  {note && <tr className="note"><td className="ln" /><td>↑ {note}</td></tr>}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
