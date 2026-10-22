import React, { useEffect, useRef, useState } from 'react';
import { Md } from './md';

/**
 * "Simplify": rewrite any block in plainer words. The platform registers the
 * backend call (a Convex action); the engine only knows this contract.
 */
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
  { level: 3, label: "Like I'm 12", hint: 'Everyday words and analogies' },
];

let simplifier: Simplifier | null = null;
let handlers: Handlers = { onAuth: () => {} };
const subs = new Set<() => void>();
export function registerSimplifier(f: Simplifier | null, h?: Handlers) {
  simplifier = f;
  if (h) handlers = h;
  subs.forEach((s) => s());
}
function useAvailable() {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => { subs.delete(s); };
  }, []);
  return !!simplifier;
}

/** Visible text of an element without the engine's own controls. */
export function readableText(el: HTMLElement | null | undefined) {
  if (!el) return '';
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.copy-btn, .simp, .simplified, .copyable-bar, .code-actions').forEach((n) => n.remove());
  // innerText needs layout; textContent is close enough on a detached clone.
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
      const r = await simplifier({ text, level, context: context() });
      if (r.status === 'ok') setState({ kind: 'done', level, text: r.text, cached: r.cached });
      else if (r.status === 'auth') { setState({ kind: 'msg', level, msg: 'Sign in to simplify explanations. New accounts get free credits.' }); handlers.onAuth(); }
      else if (r.status === 'credits') setState({ kind: 'msg', level, msg: <>You're out of credits. <a href="#/account">Get more credits</a></> });
      else if (r.status === 'rate') setState({ kind: 'msg', level, msg: `That's a lot of simplifying at once. Try again in ${Math.max(1, Math.ceil(r.retryAfterMs / 1000))}s.` });
      else setState({ kind: 'msg', level, msg: `Couldn't simplify this: ${r.message}` });
    } catch (e) {
      setState({ kind: 'msg', level, msg: 'Couldn’t reach the simplifier. Check your connection and try again.' });
    }
  };
  return { state, run, clear: () => setState({ kind: 'idle' }) };
}

/** The "Simplify" button with its three levels. */
export function SimplifyMenu({ onPick, busy }: { onPick: (l: SimplifyLevel) => void; busy?: boolean }) {
  const available = useAvailable();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="simp" ref={ref}>
      <button
        className="copy-btn simp-btn"
        disabled={!available || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        title={available ? 'Explain this in plainer words' : 'Simplify needs the Deeply backend (not connected here)'}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 7h16M7 12h10M10 17h4" /></svg>
        <span>{busy ? 'Simplifying…' : 'Simplify'}</span>
      </button>
      {open && (
        <div className="simp-menu" role="menu">
          {LEVELS.map((l) => (
            <button key={l.level} role="menuitem" onClick={() => { setOpen(false); onPick(l.level); }}>
              <b>{l.label}</b><span>{l.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The rewritten text, shown under the original. */
export function SimplifiedView({ state, onClose, onLevel }: { state: State; onClose: () => void; onLevel: (l: SimplifyLevel) => void }) {
  if (state.kind === 'idle') return null;
  const label = LEVELS.find((l) => l.level === state.level)!.label;
  return (
    <div className="simplified" aria-live="polite">
      <div className="simplified-head">
        <span className="simplified-kicker">Simplified · {label}</span>
        <span className="simplified-actions">
          {state.kind === 'done' && state.level < 3 && <button className="link" onClick={() => onLevel((state.level + 1) as SimplifyLevel)}>Simpler still</button>}
          <button className="link" onClick={onClose}>Show original only</button>
        </span>
      </div>
      {state.kind === 'loading' && <div className="simplified-loading"><span /><span /><span /></div>}
      {state.kind === 'done' && <div className="simplified-text"><Md text={state.text} /></div>}
      {state.kind === 'msg' && <p className="simplified-msg">{state.msg}</p>}
    </div>
  );
}
