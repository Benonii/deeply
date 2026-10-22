import { useCallback, useEffect, useState } from 'react';

export type Progress = {
  done: Record<string, boolean>;
  challenges: Record<string, boolean>;
};

const KEY = 'convex-academy-progress-v1';
const listeners = new Set<(progress: Progress) => void>();

function migrate(progress: Progress): Progress {
  const addNamespace = (record: Record<string, boolean>) =>
    Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key.includes(':') ? key : `convex:${key}`, value])
    );
  return { done: addNamespace(progress.done ?? {}), challenges: addNamespace(progress.challenges ?? {}) };
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
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((listener) => listener(state));
}
export function getProgress() {
  return state;
}

let currentNamespace = 'convex';
export function setProgressNamespace(namespace: string) {
  currentNamespace = namespace;
}

function scoped(record: Record<string, boolean>, namespace: string) {
  const prefix = `${namespace}:`;
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value])
  );
}

export function useProgress(namespace?: string) {
  const activeNamespace = namespace ?? currentNamespace;
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    listeners.add(setSnapshot);
    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);
  const markModule = useCallback(
    (id: string, isDone = true) =>
      setProgress({ ...state, done: { ...state.done, [`${activeNamespace}:${id}`]: isDone } }),
    [activeNamespace]
  );
  const solve = useCallback(
    (id: string, isSolved = true) =>
      setProgress({ ...state, challenges: { ...state.challenges, [`${activeNamespace}:${id}`]: isSolved } }),
    [activeNamespace]
  );
  const reset = useCallback(() => {
    const keep = (record: Record<string, boolean>) =>
      Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith(`${activeNamespace}:`)));
    setProgress({ done: keep(state.done), challenges: keep(state.challenges) });
  }, [activeNamespace]);
  const progress = {
    done: scoped(snapshot.done, activeNamespace),
    challenges: scoped(snapshot.challenges, activeNamespace)
  };
  return { progress, markModule, solve, reset, all: snapshot };
}
