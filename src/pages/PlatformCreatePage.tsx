'use client';

import { ClientOnly } from '../components/ClientOnly';
import { CreatePage } from '../create';
import { PlatformScreen } from '../platform/Shell';

export const PlatformCreatePage = () => (
  <ClientOnly>
    <PlatformScreen>
      <CreatePage />
    </PlatformScreen>
  </ClientOnly>
);
