import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from 'convex/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { getPublicEnv } from '@farm.js/core/env';
import { readConvexReactClient } from '@farm.js/convex/client';
import { makeAuthClient, setAuthClient } from '../lib/authClient';
import { AccountHost } from '../account/host';
import { anyApi } from 'convex/server';
import { getProgress, setProgress, useProgress } from '../engine/progress';
import { useIsMounted } from '../lib/hooks';
import type { WireTappedWebSocket } from '../types';

export const api = anyApi;

const URL_KEY = 'convex-academy-url';
export function getConvexUrl(): string | undefined {
  const env = getPublicEnv('CONVEX_URL');
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

function ConnectedProviders({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <ProgressSync />
      <AccountHost />
      {children}
    </>
  );
}

function LabConvexProvider({ url, children }: { url: string; children?: React.ReactNode }) {
  const client = useMemo(() => {
    installWireTap();
    setAuthClient(null);
    return new ConvexReactClient(url);
  }, [url]);
  return (
    <ConvexProvider client={client}>
      <ConnectedCtx.Provider value={client}>
        <ConnectedProviders>{children}</ConnectedProviders>
      </ConnectedCtx.Provider>
    </ConvexProvider>
  );
}

function DeploymentConvexProvider({ url, children }: { url: string; children?: React.ReactNode }) {
  const setup = useMemo(() => {
    installWireTap();
    const authClient = makeAuthClient();
    setAuthClient(authClient);
    return { client: readConvexReactClient(url), authClient };
  }, [url]);
  return (
    <ConvexBetterAuthProvider client={setup.client} authClient={setup.authClient}>
      <ConnectedCtx.Provider value={setup.client}>
        <ConnectedProviders>{children}</ConnectedProviders>
      </ConnectedCtx.Provider>
    </ConvexBetterAuthProvider>
  );
}

export function ConvexClientProvider({ url, children }: { url: string; children?: React.ReactNode }) {
  const isMounted = useIsMounted();
  if (!isMounted) return <ConnectedCtx.Provider value={null}>{children}</ConnectedCtx.Provider>;
  const activeURL = getConvexUrl() ?? url;
  if (activeURL !== url) return <LabConvexProvider url={activeURL}>{children}</LabConvexProvider>;
  return <DeploymentConvexProvider url={url}>{children}</DeploymentConvexProvider>;
}
