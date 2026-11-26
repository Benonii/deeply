import { lazy, Suspense } from 'react';

import type { ComponentProps } from 'react';
import type { BrandShaderCanvas } from './BrandShaderCanvas';

const LoadedBrandShader = lazy(() =>
  import('./BrandShaderCanvas').then((loaded) => ({ default: loaded.BrandShaderCanvas }))
);

export function BrandShader(props: ComponentProps<typeof BrandShaderCanvas>) {
  return (
    <Suspense fallback={null}>
      <LoadedBrandShader {...props} />
    </Suspense>
  );
}
