'use client';

import { useIsMounted } from '../lib/hooks';
import { AppEffects } from '../platform/App';
import '../engine/fonts.css';
import '../engine/styles.css';

import type { LayoutProps } from '@farm.js/core';

function MountedAppEffects() {
  const isMounted = useIsMounted();
  return isMounted ? <AppEffects /> : null;
}

export const RootLayout = ({ children }: LayoutProps) => (
  <>
    <MountedAppEffects />
    {children}
  </>
);
