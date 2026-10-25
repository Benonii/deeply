'use client';

import { ClientOnly } from '../components/ClientOnly';
import { PlatformScreen } from '../platform/App';
import { PlatformHome } from '../platform/Home';

export const PlatformHomePage = () => (
  <ClientOnly>
    <PlatformScreen>
      <PlatformHome />
    </PlatformScreen>
  </ClientOnly>
);
