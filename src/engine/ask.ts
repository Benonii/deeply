import { useCallback, useEffect, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

import { useLesson } from './lesson';

import type { RefObject } from 'react';
import type { AskPanelView, AskResult } from '../../convex/player/types';
import type { AskRequest, AskSelection } from '../types';

const MAXIMUM_QUOTE_LENGTH = 1200;
const SKIP_SELECTION_INSIDE = 'pre, textarea, input, .ask-panel, .copyable-bar, .simp-menu';

function readProseSelection(prose: HTMLElement | null): AskSelection | null {
  if (!prose) return null;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const quote = selection.toString().replace(/\s+/g, ' ').trim();
  if (quote.length === 0) return null;
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element = container instanceof Element ? container : container.parentElement;
  if (!element || !prose.contains(element) || element.closest(SKIP_SELECTION_INSIDE)) return null;
  const box = range.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return null;
  return {
    quote: quote.slice(0, MAXIMUM_QUOTE_LENGTH),
    sectionId: element.closest('section.section')?.id ?? '',
    top: box.top,
    left: box.left + box.width / 2
  };
}

export function useProseSelection(proseRef: RefObject<HTMLElement | null>): AskSelection | null {
  const [selection, setSelection] = useState<AskSelection | null>(null);
  useEffect(() => {
    const read = () => setSelection(readProseSelection(proseRef.current));
    document.addEventListener('selectionchange', read);
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      document.removeEventListener('selectionchange', read);
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [proseRef]);
  return selection;
}

export function useAskSession(sectionId: string) {
  const { courseId, moduleId } = useLesson();
  const panel = useQuery(anyApi.player.asks.listForModule, { courseId, moduleId }) as AskPanelView | undefined;
  const submitAsk = useAction(anyApi.player.ask.submit);
  const [request, setRequest] = useState<AskRequest>({ kind: 'idle' });

  const ask = useCallback(
    async (quote: string, question: string) => {
      setRequest({ kind: 'sending' });
      try {
        const result = (await submitAsk({ courseId, moduleId, sectionId, quote, question })) as AskResult;
        if (result.status === 'ok') setRequest({ kind: 'sent', askId: result.askId });
        else setRequest({ kind: 'refused', message: readRefusal(result) });
      } catch {
        setRequest({ kind: 'refused', message: "Couldn't reach Deeply. Check your connection and ask again." });
      }
    },
    [submitAsk, courseId, moduleId, sectionId]
  );

  return { panel, request, ask, reset: () => setRequest({ kind: 'idle' }) };
}

function readRefusal(result: Exclude<AskResult, { status: 'ok' }>): string {
  if (result.status === 'rate')
    return `That is today's last ask. More in ${formatWait(result.retryAfterMs)}, or carry on in Claude.`;
  if (result.status === 'auth') return 'Sign in to ask about a passage.';
  if (result.status === 'unsupported') return 'Ask needs a course with a concept map. This one does not have one.';
  if (result.status === 'invalid') return result.message;
  return result.message;
}

export function formatWait(milliseconds: number): string {
  const minutes = Math.ceil(milliseconds / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? 'an hour' : `${hours} hours`;
}
