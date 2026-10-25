'use client';

import type { ReactNode } from 'react';
import { useIsMounted } from '../lib/hooks';

interface ClientOnlyProps {
  children: ReactNode;
}

export const ClientOnly = ({ children }: ClientOnlyProps) => {
  const isMounted = useIsMounted();
  if (!isMounted) return null;
  return children;
};
