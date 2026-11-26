'use client';

import { ClientOnly } from '../components/ClientOnly';
import { ChatHome } from '../chat/ChatHome';
import { PlatformScreen } from '../platform/App';

export const PlatformChatPage = () => (
  <ClientOnly>
    <PlatformScreen>
      <ChatHome />
    </PlatformScreen>
  </ClientOnly>
);
