'use client';

import { ClientOnly } from '../components/ClientOnly';
import { ChatHome } from '../chat/ChatHome';
import { PlatformScreen } from '../platform/Shell';

export const PlatformChatPage = () => (
  <ClientOnly>
    <PlatformScreen>
      <ChatHome />
    </PlatformScreen>
  </ClientOnly>
);
