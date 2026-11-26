import { makeBrandMonochrome, makeBrandReadable } from './brandContrast';

import type { Brand } from './courseSchema';

export const DEEPLY_BRAND: Brand = {
  name: 'Deeply',
  colors: {
    bg: '#000000',
    surface: '#0a0a0a',
    surface2: '#141414',
    fg: '#f5f5f5',
    fg2: '#d0d0d0',
    muted: '#8c8c8c',
    line: '#262626',
    accent: '#c9f0ff',
    accent2: '#ff8f70',
    accent3: '#a99bff',
    onAccent: '#001018'
  },
  fonts: { display: 'Unbounded', body: 'Geist', mono: 'JetBrains Mono' },
  shader: { kind: 'dither', colors: ['#000000', '#3a3a3a'] },
  source: 'designed'
};

const BRAND_NAME_MAX_LENGTH = 60;

export function buildDefaultCourseBrand(name: string): Brand {
  const trimmedName = name.trim().slice(0, BRAND_NAME_MAX_LENGTH);
  return makeBrandReadable(
    makeBrandMonochrome({ ...DEEPLY_BRAND, name: trimmedName.length > 0 ? trimmedName : DEEPLY_BRAND.name })
  );
}
