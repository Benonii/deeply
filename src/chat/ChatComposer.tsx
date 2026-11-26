import { AuiIf, ComposerPrimitive } from '@assistant-ui/react';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

import { readMessageCapMessage } from '../../convex/lib/chat';

import type { ChatMessageAllowance } from '../../convex/lib/types';

const PLACEHOLDER = 'Ask for a course on anything…';

export const ChatComposer = () => {
  const allowance = useQuery(anyApi.chat.allowance.mine, {}) as ChatMessageAllowance | undefined;

  if (allowance && !allowance.isAllowed) {
    return <p className="chat-capped">{readMessageCapMessage(allowance.retryAfterMs)}</p>;
  }

  return (
    <ComposerPrimitive.Root className="chat-composer">
      <ComposerPrimitive.Input className="chat-input" rows={1} autoFocus placeholder={PLACEHOLDER} />
      <AuiIf condition={(state) => !state.thread.isRunning}>
        <ComposerPrimitive.Send className="btn primary chat-send">Send</ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(state) => state.thread.isRunning}>
        <ComposerPrimitive.Cancel className="btn ghost chat-send">Stop</ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
};
