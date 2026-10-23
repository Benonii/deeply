import React, { useEffect, useRef, useState } from 'react';
import { LoadingState } from '../components/ai/LoadingState';
import { StreamingText } from '../components/ai/StreamingText';
import { FREE_COURSES_TEXT } from '../../convex/lib/pricing';

export type SimplifyLevel = 1 | 2 | 3;
export type SimplifyResult =
  | { status: 'ok'; text: string; cached: boolean; credits?: number }
  | { status: 'auth' }
  | { status: 'credits' }
  | { status: 'rate'; retryAfterMs: number }
  | { status: 'error'; message: string };
type Simplifier = (args: { text: string; level: SimplifyLevel; context: string }) => Promise<SimplifyResult>;
type Handlers = { onAuth: () => void };

export const LEVELS: { level: SimplifyLevel; label: string; hint: string }[] = [
  { level: 1, label: 'Plainer', hint: 'Same depth, less jargon' },
  { level: 2, label: "Like I'm new", hint: 'Assumes no background' },
  { level: 3, label: "Like I'm 12", hint: 'Everyday words and analogies' }
];

let simplifier: Simplifier | null = null;
let handlers: Handlers = { onAuth: () => {} };
const subs = new Set<() => void>();
export function registerSimplifier(nextSimplifier: Simplifier | null, nextHandlers?: Handlers) {
  simplifier = nextSimplifier;
  if (nextHandlers) handlers = nextHandlers;
  subs.forEach((subscriber) => subscriber());
}
function useAvailable() {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((count) => count + 1);
    subs.add(rerender);
    return () => {
      subs.delete(rerender);
    };
  }, []);
  return !!simplifier;
}

export function readableText(element: HTMLElement | null | undefined) {
  if (!element) return '';
  const clone = element.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('.copy-btn, .simp, .simplified, .copyable-bar, .code-actions')
    .forEach((node) => node.remove());
  return (clone.innerText || clone.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; level: SimplifyLevel }
  | { kind: 'done'; level: SimplifyLevel; text: string; cached: boolean }
  | { kind: 'msg'; level: SimplifyLevel; msg: React.ReactNode };

export function useSimplify(getText: () => string, context: () => string) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const run = async (level: SimplifyLevel) => {
    if (!simplifier) return;
    const text = getText().slice(0, 12000);
    if (!text) return;
    setState({ kind: 'loading', level });
    try {
      const result = await simplifier({ text, level, context: context() });
      if (result.status === 'ok') setState({ kind: 'done', level, text: result.text, cached: result.cached });
      else if (result.status === 'auth') {
        setState({
          kind: 'msg',
          level,
          msg: `Sign in to simplify explanations. New accounts get ${FREE_COURSES_TEXT}.`
        });
        handlers.onAuth();
      } else if (result.status === 'credits')
        setState({
          kind: 'msg',
          level,
          msg: (
            <>
              You're out of credits. <a href="#/account">Get more credits</a>
            </>
          )
        });
      else if (result.status === 'rate')
        setState({
          kind: 'msg',
          level,
          msg: `That's a lot of simplifying at once. Try again in ${Math.max(1, Math.ceil(result.retryAfterMs / 1000))}s.`
        });
      else setState({ kind: 'msg', level, msg: `Couldn't simplify this: ${result.message}` });
    } catch (error) {
      setState({ kind: 'msg', level, msg: 'Couldn’t reach the simplifier. Check your connection and try again.' });
    }
  };
  return { state, run, clear: () => setState({ kind: 'idle' }) };
}

export function SimplifyMenu({ onPick, busy }: { onPick: (level: SimplifyLevel) => void; busy?: boolean }) {
  const available = useAvailable();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);
  return (
    <div className="simp" ref={ref}>
      <button
        className="copy-btn simp-btn"
        disabled={!available || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        title={available ? 'Explain this in plainer words' : 'Simplify needs the Deeply backend (not connected here)'}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 7h16M7 12h10M10 17h4" />
        </svg>
        <span>{busy ? 'Simplifying…' : 'Simplify'}</span>
      </button>
      {open && (
        <div className="simp-menu" role="menu">
          {LEVELS.map((levelOption) => (
            <button
              key={levelOption.level}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(levelOption.level);
              }}
            >
              <b>{levelOption.label}</b>
              <span>{levelOption.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SimplifiedView({
  state,
  onClose,
  onLevel
}: {
  state: State;
  onClose: () => void;
  onLevel: (level: SimplifyLevel) => void;
}) {
  if (state.kind === 'idle') return null;
  const label = LEVELS.find((levelOption) => levelOption.level === state.level)!.label;
  return (
    <div className="simplified" aria-live="polite">
      <div className="simplified-head">
        <span className="simplified-kicker">Simplified · {label}</span>
        <span className="simplified-actions">
          {state.kind === 'done' && state.level < 3 && (
            <button className="link" onClick={() => onLevel((state.level + 1) as SimplifyLevel)}>
              Simpler still
            </button>
          )}
          <button className="link" onClick={onClose}>
            Show original only
          </button>
        </span>
      </div>
      {state.kind === 'loading' && (
        <div className="simplified-loading">
          <LoadingState label="Simplifying" />
        </div>
      )}
      {state.kind === 'done' && (
        <div className="simplified-text">
          <StreamingText text={state.text} />
        </div>
      )}
      {state.kind === 'msg' && <p className="simplified-msg">{state.msg}</p>}
    </div>
  );
}
