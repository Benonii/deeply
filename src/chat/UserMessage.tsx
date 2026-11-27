import { MessagePrimitive } from '@assistant-ui/react';

export const UserMessage = () => (
  <MessagePrimitive.Root className="chat-row chat-row-user">
    <div className="chat-said">
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);
