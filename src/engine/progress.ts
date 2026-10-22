import { useCallback, useEffect, useState } from 'react';

/**
 * Progress lives in localStorage and, when a Convex deployment is configured,
 * is mirrored to Convex (see src/platform/convexClient.tsx).
 *
 * Keys are namespaced per course: `<courseId>:<moduleId>` and
 * `<courseId>:<challengeId>`. Course code calls useProgress() without a
 * namespace and gets the course the shell is currently showing.
 */
export type Progress = {
  done: Record<string, boolean>;
  challenges: Record<string, boolean>;
};

const KEY = 'convex-academy-progress-v1';
const listeners = new Set<(p: Progress) => void>();

/** Course progress from before namespacing belonged to the Convex course. */
function migrate(p: Progress): Progress {
  const ns = (r: Record<string, boolean>) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k.includes(':') ? k : `convex:${k}`, v]));
  return { done: ns(p.done ?? {}), challenges: ns(p.challenges ?? {}) };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate({ done: {}, challenges: {}, ...JSON.parse(raw) });
  } catch {}
  return { done: {}, challenges: {} };
}
let state: Progress = load();

export function setProgress(next: Progress) {
  state = migrate(next);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l(state));
}
export function getProgress() { return state; }

let currentNs = 'convex';
/** Called by the course shell so course code can use un-namespaced ids. */
export function setProgressNamespace(ns: string) { currentNs = ns; }

function scoped(r: Record<string, boolean>, ns: string) {
  const prefix = ns + ':';
  return Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
}

export function useProgress(namespace?: string) {
  const ns = namespace ?? currentNs;
  const [p, setP] = useState(state);
  useEffect(() => {
    listeners.add(setP);
    return () => { listeners.delete(setP); };
  }, []);
  const markModule = useCallback((id: string, v = true) => setProgress({ ...state, done: { ...state.done, [`${ns}:${id}`]: v } }), [ns]);
  const solve = useCallback((id: string, v = true) => setProgress({ ...state, challenges: { ...state.challenges, [`${ns}:${id}`]: v } }), [ns]);
  const reset = useCallback(() => {
    const keep = (r: Record<string, boolean>) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith(ns + ':')));
    setProgress({ done: keep(state.done), challenges: keep(state.challenges) });
  }, [ns]);
  const progress = { done: scoped(p.done, ns), challenges: scoped(p.challenges, ns) };
  return { progress, markModule, solve, reset, all: p };
}
