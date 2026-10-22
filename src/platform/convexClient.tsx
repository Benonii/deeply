import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConvexReactClient, useMutation, useQuery } from 'convex/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { makeAuthClient, setAuthClient } from '../lib/authClient';
import { AccountHost } from '../account/host';
import { anyApi } from 'convex/server';
import { getProgress, setProgress, useProgress } from '../engine/progress';

// Function references without codegen: anyApi.lab.send === api.lab.send
export const api = anyApi;

const URL_KEY = 'convex-academy-url';
export function getConvexUrl(): string | undefined {
  const env = process.env.FARM_CONVEX_URL; // inlined at build time by farm.config.ts
  let stored: string | null = null;
  try { stored = localStorage.getItem(URL_KEY); } catch {}
  return stored || env || undefined;
}
export function setConvexUrl(url: string | null) {
  try {
    if (url) localStorage.setItem(URL_KEY, url);
    else localStorage.removeItem(URL_KEY);
  } catch {}
  location.reload();
}

/* ------------------------------------------------------------------ */
/* Wire tap: record every WebSocket frame so the Live Lab can show the */
/* real sync protocol (ModifyQuerySet, Transition, MutationResponse…). */
/* ------------------------------------------------------------------ */

export type Frame = { id: number; dir: 'up' | 'down'; t: number; type: string; raw: string };
const frames: Frame[] = [];
const frameListeners = new Set<() => void>();
let frameId = 0;

function record(dir: 'up' | 'down', data: unknown) {
  if (typeof data !== 'string') return;
  let type = 'binary';
  try { type = JSON.parse(data).type ?? 'unknown'; } catch {}
  frames.push({ id: frameId++, dir, t: Date.now(), type, raw: data });
  if (frames.length > 300) frames.shift();
  frameListeners.forEach((l) => l());
}

function installWireTap() {
  const W = window.WebSocket as any;
  if (W.__tapped) return;
  class Tapped extends W {
    constructor(...args: any[]) {
      super(...args);
      this.addEventListener('message', (e: MessageEvent) => record('down', e.data));
    }
    send(data: any) {
      record('up', data);
      super.send(data);
    }
  }
  (Tapped as any).__tapped = true;
  window.WebSocket = Tapped as any;
}

export function useFrames() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    frameListeners.add(l);
    return () => { frameListeners.delete(l); };
  }, []);
  return frames;
}
export function clearFrames() {
  frames.length = 0;
  frameListeners.forEach((l) => l());
}

/* ------------------------------------------------------------------ */

export function deviceId() {
  try {
    let id = localStorage.getItem('convex-academy-device');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('convex-academy-device', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

const ConnectedCtx = React.createContext<ConvexReactClient | null>(null);
export const useConvexClient = () => React.useContext(ConnectedCtx);

function ProgressSync() {
  const id = useMemo(deviceId, []);
  const remote = useQuery(api.progress.get, { deviceId: id });
  const save = useMutation(api.progress.save);
  const { all: progress } = useProgress();
  const hydrated = useRef(false);

  // First load: merge server progress into local.
  useEffect(() => {
    if (remote === undefined || hydrated.current) return;
    hydrated.current = true;
    if (remote) {
      const local = getProgress();
      setProgress({
        done: { ...remote.done, ...local.done },
        challenges: { ...remote.challenges, ...local.challenges },
      });
    }
  }, [remote]);

  // Afterwards: push changes up (debounced).
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => { save({ deviceId: id, ...progress }).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [progress, id, save]);
  return null;
}

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const url = getConvexUrl();
  const setup = useMemo(() => {
    if (!url) return null;
    installWireTap();
    try {
      const client = new ConvexReactClient(url);
      const authClient = makeAuthClient(url);
      setAuthClient(authClient);
      return { client, authClient };
    } catch {
      return null;
    }
  }, [url]);
  if (!setup) return <ConnectedCtx.Provider value={null}>{children}</ConnectedCtx.Provider>;
  return (
    <ConvexBetterAuthProvider client={setup.client} authClient={setup.authClient}>
      <ConnectedCtx.Provider value={setup.client}>
        <ProgressSync />
        <AccountHost />
        {children}
      </ConnectedCtx.Provider>
    </ConvexBetterAuthProvider>
  );
}
