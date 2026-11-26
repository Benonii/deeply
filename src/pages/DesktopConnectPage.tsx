'use client';

import { DesktopConnect } from '../account/DesktopConnect';
import { ClientOnly } from '../components/ClientOnly';
import { PlatformScreen } from '../platform/Shell';

export const DesktopConnectPage = () => (
  <ClientOnly>
    <PlatformScreen>
      <DesktopConnect />
    </PlatformScreen>
  </ClientOnly>
);
