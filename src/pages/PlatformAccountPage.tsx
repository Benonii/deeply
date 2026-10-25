'use client';

import { ClientOnly } from '../components/ClientOnly';
import { AccountPage } from '../account';
import { PlatformScreen } from '../platform/App';

export const PlatformAccountPage = () => (
  <ClientOnly>
    <PlatformScreen>
      <AccountPage />
    </PlatformScreen>
  </ClientOnly>
);
