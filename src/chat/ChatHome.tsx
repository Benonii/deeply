import { useMemo } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { useConvexAuth } from 'convex/react';

import { useConvexClient } from '../platform/convexClient';
import { ChatOffline } from './ChatOffline';
import { ChatThread } from './ChatThread';
import { CourseCardSkeleton } from './CourseCardSkeleton';
import { SignedOutChat } from './SignedOutChat';
import { createChatTransport } from './transport';
import './chat.css';

const ChatLoading = () => (
  <div className="chat-column chat-loading">
    <CourseCardSkeleton />
    <CourseCardSkeleton />
  </div>
);

const ChatSurface = () => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const transport = useMemo(createChatTransport, []);
  const runtime = useChatRuntime({ transport });

  if (isLoading) return <ChatLoading />;
  if (!isAuthenticated) return <SignedOutChat />;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatThread />
    </AssistantRuntimeProvider>
  );
};

export const ChatHome = () => {
  const client = useConvexClient();
  if (!client) return <ChatOffline />;
  return <ChatSurface />;
};
