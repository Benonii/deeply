import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { readableText, SimplifiedView, SimplifyMenu, useSimplify } from './simplify';
import { FlowEdgeLabel } from './FlowEdgeLabel';
import { measureNode } from './flowGeometry';
import { routeFlowEdges } from './flowRouting';
import { Inline } from './md';

import type { FlowEdge, FlowNode, FlowStep } from '../types';

export const ModuleCtx = createContext<{ title: string; course?: string }>({ title: 'Deeply' });

function useBlockSimplify(label: string, getText: () => string) {
  const courseModule = useContext(ModuleCtx);
  return useSimplify(getText, () => [courseModule.course, courseModule.title, label].filter(Boolean).join(' › '));
}

export function buildPrompt(path: string[], body: string) {
  return `I'm studying Convex. Explain this part in more depth, check my understanding, and give me an example:\n\n[${path.join(' › ')}]\n\n${body.trim()}\n`;
}

type CodeReq = { ids: string[]; context: string };
let codeOpener: ((request: CodeReq) => void) | null = null;
export function registerCodeOpener(opener: ((request: CodeReq) => void) | null) {
  codeOpener = opener;
}
export function openCode(ids: string[], context: string) {
  codeOpener?.({ ids, context });
}

let toastSetter: ((message: string | null) => void) | null = null;
export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    toastSetter = setMessage;
    return () => {
      toastSetter = null;
    };
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <div className={`toast ${message ? 'show' : ''}`} role="status">
      {message}
    </div>
  );
}

export async function copyText(text: string, label = 'Copied — paste it to Claude') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
  toastSetter?.(label);
}

export function CopyBtn({ get, label = 'Copy', title }: { get: () => string; label?: string; title?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className={`copy-btn ${done ? 'done' : ''}`}
      title={title ?? 'Copy as a prompt for Claude'}
      onClick={(event) => {
        event.stopPropagation();
        copyText(get());
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        {done ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </>
        )}
      </svg>
      <span>{done ? 'Copied' : label}</span>
    </button>
  );
}

export function Copyable({
  label,
  children,
  className = '',
  extra
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  extra?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const courseModule = useContext(ModuleCtx);
  const body = () => readableText(ref.current?.querySelector('.copyable-body') as HTMLElement);
  const simp = useBlockSimplify(label, body);
  return (
    <div className={`copyable ${className} ${simp.state.kind !== 'idle' ? 'is-simplified' : ''}`} ref={ref}>
      <div className="copyable-bar">
        <SimplifyMenu onPick={simp.run} busy={simp.state.kind === 'loading'} />
        <CopyBtn get={() => buildPrompt([courseModule.title, label], body() + (extra ? `\n\n${extra}` : ''))} />
      </div>
      <div className="copyable-body">{children}</div>
      <SimplifiedView state={simp.state} onClose={simp.clear} onLevel={simp.run} />
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const courseModule = useContext(ModuleCtx);
  const text = () => readableText(ref.current);
  const simp = useBlockSimplify(title, text);
  return (
    <section className="section reveal" id={id} ref={ref}>
      <header className="section-head">
        <h2>{title}</h2>
        <span className="section-actions">
          <SimplifyMenu onPick={simp.run} busy={simp.state.kind === 'loading'} />
          <CopyBtn label="Copy section" get={() => buildPrompt([courseModule.title, title], text())} />
        </span>
      </header>
      <SimplifiedView state={simp.state} onClose={simp.clear} onLevel={simp.run} />
      {children}
    </section>
  );
}

type CalloutKind = 'insight' | 'warn' | 'deep' | 'analogy' | 'rule';
const calloutLabel: Record<CalloutKind, string> = {
  insight: 'Key insight',
  warn: 'Gotcha',
  deep: 'Under the hood',
  analogy: 'Mental model',
  rule: 'Rule of thumb'
};
export function Callout({
  kind = 'insight',
  title,
  children
}: {
  kind?: CalloutKind;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Copyable label={title ?? calloutLabel[kind]} className={`callout callout-${kind}`}>
      <div className="callout-kicker">{calloutLabel[kind]}</div>
      {title && <div className="callout-title">{title}</div>}
      <div className="callout-text">{children}</div>
    </Copyable>
  );
}

export function KeyTerms({ terms }: { terms: { term: string; def: React.ReactNode }[] }) {
  return (
    <Copyable label="Key terms" className="terms">
      <dl>
        {terms.map((term) => (
          <div key={term.term} className="term">
            <dt>{term.term}</dt>
            <dd>{term.def}</dd>
          </div>
        ))}
      </dl>
    </Copyable>
  );
}

export function Compare({ head, rows, caption }: { head: string[]; rows: React.ReactNode[][]; caption?: string }) {
  return (
    <Copyable label={caption ?? 'Comparison table'} className="compare">
      {caption && <div className="compare-cap">{caption}</div>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {head.map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Copyable>
  );
}

const KEYWORDS =
  /\b(import|from|export|const|let|var|async|await|return|function|if|else|for|of|in|new|throw|try|catch|default|type|interface|extends|as|while|break|continue|null|undefined|true|false|typeof)\b/;
const RUST_KW =
  /\b(fn|pub|impl|struct|enum|match|let|mut|self|Self|use|mod|async|await|where|trait|crate|super|dyn|move|ref|loop|unsafe|const|static|type|return|if|else|for|in|while|break|continue|true|false|Some|None|Ok|Err)\b/;
export function highlight(code: string, lang = 'ts') {
  const keywords = lang === 'rust' ? RUST_KW : KEYWORDS;
  const pattern =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')|\b(\d[\d_.]*)\b|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;
  while ((match = pattern.exec(code))) {
    if (match.index > last) out.push(code.slice(last, match.index));
    const [token, comment, stringLiteral, numberLiteral, functionName, id] = match;
    if (comment)
      out.push(
        <span key={keyCounter++} className="tk-com">
          {token}
        </span>
      );
    else if (stringLiteral)
      out.push(
        <span key={keyCounter++} className="tk-str">
          {token}
        </span>
      );
    else if (numberLiteral)
      out.push(
        <span key={keyCounter++} className="tk-num">
          {token}
        </span>
      );
    else if (functionName)
      out.push(
        <span
          key={keyCounter++}
          className={keywords.test(token) && token.match(keywords)![0] === token ? 'tk-kw' : 'tk-fn'}
        >
          {token}
        </span>
      );
    else if (id)
      out.push(
        keywords.test(token) && token.match(keywords)![0] === token ? (
          <span key={keyCounter++} className="tk-kw">
            {token}
          </span>
        ) : /^(ctx|db|v|api|internal)$/.test(token) ? (
          <span key={keyCounter++} className="tk-ctx">
            {token}
          </span>
        ) : (
          token
        )
      );
    last = match.index + token.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function Code({
  code,
  title,
  lang = 'ts',
  note
}: {
  code: string;
  title?: string;
  lang?: string;
  note?: React.ReactNode;
}) {
  const courseModule = useContext(ModuleCtx);
  const body = code.replace(/^\n/, '').replace(/\s+$/, '');
  const highlighted = useMemo(() => highlight(body, lang), [body, lang]);
  const noteRef = useRef<HTMLDivElement>(null);
  const simp = useBlockSimplify(
    title ?? 'code',
    () => `Explain what this code does.\n\n${title ? `${title}\n` : ''}${body}\n\n${readableText(noteRef.current)}`
  );
  return (
    <figure className="code">
      <figcaption>
        <span className="code-title">{title ?? lang}</span>
        <span className="code-actions">
          <SimplifyMenu onPick={simp.run} busy={simp.state.kind === 'loading'} />
          <CopyBtn label="Code" title="Copy raw code" get={() => body} />
          <CopyBtn
            label="Ask"
            get={() =>
              buildPrompt(
                [courseModule.title, title ?? 'code'],
                'Walk me through this code line by line and what happens under the hood:\n\n```' +
                  lang +
                  '\n' +
                  body +
                  '\n```'
              )
            }
          />
        </span>
      </figcaption>
      <pre>
        <code>{highlighted}</code>
      </pre>
      {note && (
        <div className="code-note" ref={noteRef}>
          {note}
        </div>
      )}
      <SimplifiedView state={simp.state} onClose={simp.clear} onLevel={simp.run} />
    </figure>
  );
}

export function Flow({
  title,
  nodes,
  edges,
  steps,
  width = 1000,
  height = 420,
  caption
}: {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  steps: FlowStep[];
  width?: number;
  height?: number;
  caption?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const courseModule = useContext(ModuleCtx);
  const step = steps[stepIndex];
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
      else setPlaying(false);
    }, 3400);
    return () => clearTimeout(timer);
  }, [playing, stepIndex, steps.length]);

  const openEdgeCode = (edge: FlowEdge) =>
    openCode(edge.code ?? [], `${title}: ${edge.label ?? `${edge.from} → ${edge.to}`}`);
  const paths = useMemo(() => routeFlowEdges(nodes, edges, { width, height }), [nodes, edges, width, height]);

  const simp = useBlockSimplify(title, () => describe());
  const describe = () =>
    `Diagram: ${title}\nComponents: ${nodes.map((node) => node.label + (node.sub ? ` (${node.sub})` : '')).join(', ')}\n\n` +
    steps.map((step, index) => `${index + 1}. ${step.title} — ${step.text}`).join('\n') +
    `\n\nI'm currently on step ${stepIndex + 1}: "${step.title}".`;

  return (
    <figure className="flow reveal">
      <figcaption className="flow-head">
        <div>
          <div className="flow-kicker">Interactive diagram</div>
          <div className="flow-title">{title}</div>
        </div>
        <span className="section-actions">
          <SimplifyMenu onPick={simp.run} busy={simp.state.kind === 'loading'} />
          <CopyBtn label="Copy diagram" get={() => buildPrompt([courseModule.title, title], describe())} />
        </span>
      </figcaption>
      <SimplifiedView state={simp.state} onClose={simp.clear} onLevel={simp.run} />
      <div className="flow-canvas">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className="arrow-head" />
            </marker>
            <marker
              id="arrow-on"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className="arrow-head on" />
            </marker>
          </defs>
          {paths.map(({ edge: e, path: d }) => {
            const on = step.edges?.includes(e.id);
            const hasCode = !!e.code?.length;
            return (
              <g
                key={e.id}
                className={`edge ${on ? 'on' : ''} ${hasCode ? 'has-code' : ''}`}
                onClick={hasCode ? () => openEdgeCode(e) : undefined}
              >
                {hasCode && (
                  <path d={d} className="edge-hit">
                    <title>Show the code for this hop</title>
                  </path>
                )}
                <path
                  id={`p-${title}-${e.id}`.replace(/\W/g, '')}
                  d={d}
                  markerEnd={`url(#${on ? 'arrow-on' : 'arrow'})`}
                />
                {on && (
                  <circle r="6" className="packet">
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}
          {nodes.map((node) => {
            const box = measureNode(node);
            const nodeWidth = box.right - box.left;
            const nodeHeight = box.bottom - box.top;
            const on = step.nodes?.includes(node.id);
            const hasCode = !!node.code?.length;
            return (
              <g
                key={node.id}
                className={`node tone-${node.tone ?? 'plain'} ${on ? 'on' : ''} ${hasCode ? 'has-code' : ''}`}
                transform={`translate(${node.x},${node.y})`}
                onClick={hasCode ? () => openCode(node.code!, `${title}: ${node.label}`) : undefined}
                onKeyDown={
                  hasCode
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openCode(node.code!, `${title}: ${node.label}`);
                        }
                      }
                    : undefined
                }
                tabIndex={hasCode ? 0 : undefined}
                role={hasCode ? 'button' : undefined}
                aria-label={hasCode ? `Show source for ${node.label}` : undefined}
              >
                <rect width={nodeWidth} height={nodeHeight} rx="12" />
                {hasCode && (
                  <g className="code-badge" transform={`translate(${nodeWidth - 30},-9)`}>
                    <rect width="34" height="18" rx="9" />
                    <text x="17" y="12.5" textAnchor="middle">
                      {'</>'}
                    </text>
                  </g>
                )}
                <text
                  x={nodeWidth / 2}
                  y={node.sub ? nodeHeight / 2 - 4 : nodeHeight / 2 + 5}
                  textAnchor="middle"
                  className="node-label"
                  {...fitText(node.label, 8.4, nodeWidth)}
                >
                  {node.label}
                </text>
                {node.sub && (
                  <text
                    x={nodeWidth / 2}
                    y={nodeHeight / 2 + 15}
                    textAnchor="middle"
                    className="node-sub"
                    {...fitText(node.sub, 6.95, nodeWidth)}
                  >
                    {node.sub}
                  </text>
                )}
              </g>
            );
          })}
          {paths.map(({ edge, label }) =>
            label ? (
              <FlowEdgeLabel
                key={edge.id}
                label={label}
                isActive={!!step.edges?.includes(edge.id)}
                onOpenCode={edge.code?.length ? () => openEdgeCode(edge) : undefined}
              />
            ) : null
          )}
        </svg>
      </div>
      <div className="flow-steps">
        <div className="flow-controls">
          <button
            onClick={() => {
              setPlaying(false);
              setStepIndex(Math.max(0, stepIndex - 1));
            }}
            disabled={stepIndex === 0}
            aria-label="Previous step"
          >
            ←
          </button>
          <button
            className="play"
            onClick={() => {
              if (stepIndex === steps.length - 1) setStepIndex(0);
              setPlaying(!playing);
            }}
          >
            {playing ? 'Pause' : stepIndex === steps.length - 1 ? 'Replay' : 'Play'}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setStepIndex(Math.min(steps.length - 1, stepIndex + 1));
            }}
            disabled={stepIndex === steps.length - 1}
            aria-label="Next step"
          >
            →
          </button>
          <div className="dots">
            {steps.map((_, index) => (
              <button
                key={index}
                className={index === stepIndex ? 'on' : index < stepIndex ? 'past' : ''}
                onClick={() => {
                  setPlaying(false);
                  setStepIndex(index);
                }}
                aria-label={`Step ${index + 1}`}
              />
            ))}
          </div>
        </div>
        <div className="flow-text" key={stepIndex}>
          <div className="flow-step-n">
            Step {stepIndex + 1} / {steps.length}
          </div>
          <div className="flow-step-title">{step.title}</div>
          <p>
            <Inline text={step.text} />
          </p>
        </div>
      </div>
      {(nodes.some((node) => node.code?.length) || edges.some((edge) => edge.code?.length)) && (
        <div className="flow-caption code-hint">
          <span className="code-mark">{'</>'}</span> Click a marked box or arrow to read the real Convex source behind
          it.
        </div>
      )}
      {caption && <div className="flow-caption">{caption}</div>}
    </figure>
  );
}

function fitText(text: string, characterWidth: number, maxWidth: number) {
  return text.length * characterWidth > maxWidth - 14
    ? { textLength: maxWidth - 14, lengthAdjust: 'spacingAndGlyphs' as const }
    : {};
}

export function Diagram({
  title,
  describe,
  height = 360,
  children,
  caption
}: {
  title: string;
  describe: string;
  height?: number;
  children: React.ReactNode;
  caption?: string;
}) {
  const courseModule = useContext(ModuleCtx);
  const simp = useBlockSimplify(title, () => `Diagram: ${title}\n${describe}${caption ? `\n${caption}` : ''}`);
  return (
    <figure className="flow reveal">
      <figcaption className="flow-head">
        <div>
          <div className="flow-kicker">Diagram</div>
          <div className="flow-title">{title}</div>
        </div>
        <span className="section-actions">
          <SimplifyMenu onPick={simp.run} busy={simp.state.kind === 'loading'} />
          <CopyBtn label="Copy diagram" get={() => buildPrompt([courseModule.title, title], describe)} />
        </span>
      </figcaption>
      <SimplifiedView state={simp.state} onClose={simp.clear} onLevel={simp.run} />
      <div className="flow-canvas static">
        <svg viewBox={`0 0 1000 ${height}`} role="img" aria-label={title}>
          {children}
        </svg>
      </div>
      {caption && <div className="flow-caption">{caption}</div>}
    </figure>
  );
}

export function Check({
  question: q,
  options,
  answer,
  explain
}: {
  question: string;
  options: string[];
  answer: number;
  explain: string;
}) {
  const [pick, setPick] = useState<number | null>(null);
  const courseModule = useContext(ModuleCtx);
  const simp = useBlockSimplify(
    'Quick check',
    () =>
      `Rephrase this quiz question in plainer words without giving away the answer.\n\nQuestion: ${q}\nOptions:\n${options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n')}${pick !== null ? `\n\nExplanation: ${explain}` : ''}`
  );
  return (
    <div className="check reveal">
      <div className="check-head">
        <span className="check-kicker">Quick check</span>
        <span className="section-actions">
          <SimplifyMenu onPick={simp.run} busy={simp.state.kind === 'loading'} />
          <CopyBtn
            get={() =>
              buildPrompt(
                [courseModule.title, 'Quick check'],
                `Question: ${q}\nOptions:\n${options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n')}\n${pick !== null ? `I picked ${String.fromCharCode(65 + pick)}. Correct is ${String.fromCharCode(65 + answer)}.` : ''}\nExplanation given: ${explain}\nWhy is that right, and why are the others wrong?`
              )
            }
          />
        </span>
      </div>
      <SimplifiedView state={simp.state} onClose={simp.clear} onLevel={simp.run} />
      <div className="check-q">
        <Inline text={q} />
      </div>
      <div className="check-opts">
        {options.map((option, index) => (
          <button
            key={index}
            disabled={pick !== null}
            className={pick === null ? '' : index === answer ? 'right' : index === pick ? 'wrong' : 'dim'}
            onClick={() => setPick(index)}
          >
            <span className="opt-letter">{String.fromCharCode(65 + index)}</span>
            <span>
              <Inline text={option} />
            </span>
          </button>
        ))}
      </div>
      {pick !== null && (
        <div className={`check-explain ${pick === answer ? 'ok' : 'no'}`}>
          <strong>{pick === answer ? 'Correct.' : 'Not quite.'}</strong> <Inline text={explain} />
          <button className="link" onClick={() => setPick(null)}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export const InlineCode = ({ children }: { children: React.ReactNode }) => <code className="ic">{children}</code>;

export type Module = {
  id: string;
  n: number;
  title: string;
  kicker: string;
  minutes: number;
  summary: string;
  Component: React.FC;
};
