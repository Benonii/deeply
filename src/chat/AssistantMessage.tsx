import { ErrorPrimitive, MessagePrimitive } from '@assistant-ui/react';

import { ASSISTANT_PARTS } from './parts';

export const AssistantMessage = () => (
  <MessagePrimitive.Root className="chat-row chat-row-assistant">
    <div className="chat-reply">
      <MessagePrimitive.Parts components={ASSISTANT_PARTS} />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="chat-error">
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </div>
  </MessagePrimitive.Root>
);
