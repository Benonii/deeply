import { AuiIf, ThreadPrimitive } from '@assistant-ui/react';

import { AssistantMessage } from './AssistantMessage';
import { ChatComposer } from './ChatComposer';
import { ChatWelcome } from './ChatWelcome';
import { UserMessage } from './UserMessage';

import type { MessageState } from '@assistant-ui/react';

const renderMessage = ({ message }: { message: MessageState }) =>
  message.role === 'user' ? <UserMessage /> : <AssistantMessage />;

export const ChatThread = () => (
  <ThreadPrimitive.Root className="chat">
    <ThreadPrimitive.Viewport className="chat-viewport" autoScroll>
      <div className="chat-column">
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <ChatWelcome />
        </AuiIf>
        <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>
        <AuiIf condition={(state) => state.thread.isRunning}>
          <p className="chat-thinking">Thinking…</p>
        </AuiIf>
      </div>
    </ThreadPrimitive.Viewport>
    <div className="chat-dock">
      <div className="chat-column">
        <ChatComposer />
      </div>
    </div>
  </ThreadPrimitive.Root>
);
