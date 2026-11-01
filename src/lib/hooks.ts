import { useEffect, useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { postDesktopSession } from './api';
import { buildConnectURL, createPairingCode, formatCheckCode } from './desktopPairing';

const api = anyApi;

const TICK_MILLISECONDS = 100;
const WORD_MILLISECONDS = 55;
const MAXIMUM_REVEAL_TICKS = 60;

function formatElapsedTime(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function useElapsedTime(startedAt?: number) {
  const [mountedAt] = useState(Date.now);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MILLISECONDS);
    return () => clearInterval(timer);
  }, []);
  return { elapsedLabel: formatElapsedTime(now - (startedAt ?? mountedAt)) };
}

export function useWordReveal(text: string) {
  const words = text.split(/(?<=\s)/);
  const wordsPerTick = Math.max(1, Math.ceil(words.length / MAXIMUM_REVEAL_TICKS));
  const [revealedText, setRevealedText] = useState(text);
  const [visibleCount, setVisibleCount] = useState(() => (prefersReducedMotion() ? words.length : 0));
  if (revealedText !== text) {
    setRevealedText(text);
    setVisibleCount(prefersReducedMotion() ? words.length : 0);
  }
  const isRevealing = visibleCount < words.length;
  useEffect(() => {
    if (!isRevealing) return;
    const timer = setInterval(() => setVisibleCount((count) => count + wordsPerTick), WORD_MILLISECONDS);
    return () => clearInterval(timer);
  }, [isRevealing, wordsPerTick]);
  return { visibleText: words.slice(0, visibleCount).join(''), isRevealing };
}

const subscribeToNothing = () => () => {};

export function useIsMounted() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

export function useDesktopPairing() {
  const [pairingCode] = useState(createPairingCode);
  const status = useQuery(api.desktopSignIn.status, { pairingCode }) as { isApproved: boolean } | undefined;
  const claim = useMutation(api.desktopSignIn.claim);
  const [error, setError] = useState<string | null>(null);
  const isApproved = status?.isApproved ?? false;

  useEffect(() => {
    if (!isApproved) return;
    const finishSignIn = async () => {
      try {
        const oneTimeToken = (await claim({ pairingCode })) as string | null;
        if (!oneTimeToken) throw new Error('That sign-in expired. Start again.');
        await postDesktopSession({ oneTimeToken });
        location.reload();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
      }
    };
    finishSignIn();
  }, [isApproved, claim, pairingCode]);

  return {
    connectURL: buildConnectURL(pairingCode),
    checkCode: formatCheckCode(pairingCode),
    isFinishing: isApproved && !error,
    error
  };
}
