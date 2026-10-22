import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConvexReactClient, useMutation, useQuery } from 'convex/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { makeAuthClient, setAuthClient } from '../lib/authClient';
import { AccountHost } from '../account/host';
import { anyApi } from 'convex/server';
import { getProgress, setProgress, useProgress } from '../engine/progress';
import type { WireTappedWebSocket } from '../types';

export const api = anyApi;

const URL_KEY = 'convex-academy-url';
export function getConvexUrl(): string | undefined {
  const env = process.env.FARM_CONVEX_URL;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(URL_KEY);
  } catch {}
  return stored || env || undefined;
}
export function setConvexUrl(url: string | null) {
  try {
    if (url) localStorage.setItem(URL_KEY, url);
    else localStorage.removeItem(URL_KEY);
  } catch {}
  location.reload();
}

export type Frame = { id: number; dir: 'up' | 'down'; t: number; type: string; raw: string };
const frames: Frame[] = [];
const frameListeners = new Set<() => void>();
let frameId = 0;

function record(direction: 'up' | 'down', data: unknown) {
  if (typeof data !== 'string') return;
  let type = 'binary';
  try {
    type = JSON.parse(data).type ?? 'unknown';
  } catch {}
  frames.push({ id: frameId++, dir: direction, t: Date.now(), type, raw: data });
  if (frames.length > 300) frames.shift();
  frameListeners.forEach((listener) => listener());
}

function installWireTap() {
  const OriginalWebSocket: typeof WebSocket & WireTappedWebSocket = window.WebSocket;
  if (OriginalWebSocket.isTapped) return;
  class Tapped extends OriginalWebSocket {
    static isTapped = true;
    constructor(...args: ConstructorParameters<typeof WebSocket>) {
      super(...args);
      this.addEventListener('message', (event: MessageEvent) => record('down', event.data));
    }
    send(data: Parameters<WebSocket['send']>[0]) {
      record('up', data);
      super.send(data);
    }
  }
  window.WebSocket = Tapped;
}

export function useFrames() {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((count) => count + 1);
    frameListeners.add(rerender);
    return () => {
      frameListeners.delete(rerender);
    };
  }, []);
  return frames;
}
export function clearFrames() {
  frames.length = 0;
  frameListeners.forEach((listener) => listener());
}

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

  useEffect(() => {
    if (remote === undefined || hydrated.current) return;
    hydrated.current = true;
    if (remote) {
      const local = getProgress();
      setProgress({
        done: { ...remote.done, ...local.done },
        challenges: { ...remote.challenges, ...local.challenges }
      });
    }
  }, [remote]);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => {
      save({ deviceId: id, ...progress }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
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
