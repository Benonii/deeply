'use client';

import { ClientOnly } from '../components/ClientOnly';
import { AccountPage } from '../account/AccountPage';
import { PlatformScreen } from '../platform/Shell';

export const PlatformAccountPage = () => (
  <ClientOnly>
    <PlatformScreen>
      <AccountPage />
    </PlatformScreen>
  </ClientOnly>
);
