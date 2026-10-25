'use client';

import { AppProviders } from '../account';
import { useIsMounted } from '../lib/hooks';
import { AppEffects } from '../platform/App';
import '../engine/fonts.css';
import '../engine/styles.css';

import type { LayoutProps } from '@farm.js/core';

export const RootLayout = ({ children }: LayoutProps) => {
  const isMounted = useIsMounted();
  if (!isMounted) return children;
  return (
    <AppProviders>
      <AppEffects />
      {children}
    </AppProviders>
  );
};
