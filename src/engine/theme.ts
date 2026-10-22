import { useEffect } from 'react';
import type React from 'react';
import type { Brand } from '../../convex/lib/courseSchema';

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
    onAccent: '#001018',
  },
  fonts: { display: 'Unbounded', body: 'Geist', mono: 'JetBrains Mono' },
  shader: { kind: 'dither', colors: ['#000000', '#3a3a3a'] },
  source: 'designed',
};

const FALLBACK = {
  display: 'ui-sans-serif, system-ui, sans-serif',
  body: 'ui-sans-serif, system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

export function brandVars(brand: Brand): React.CSSProperties {
  const colors = brand.colors;
  return {
    '--bg': colors.bg,
    '--bg2': colors.surface,
    '--panel': colors.surface2,
    '--panel2': `color-mix(in oklab, ${colors.surface2} 82%, ${colors.fg})`,
    '--fg': colors.fg,
    '--fg2': colors.fg2,
    '--muted': colors.muted,
    '--line': colors.line,
    '--line2': `color-mix(in oklab, ${colors.line} 75%, ${colors.fg})`,
    '--accent': colors.accent,
    '--accent2': colors.accent2,
    '--accent3': colors.accent3,
    '--on-accent': colors.onAccent,
    '--font-display': `'${brand.fonts.display}', ${FALLBACK.display}`,
    '--font-body': `'${brand.fonts.body}', ${FALLBACK.body}`,
    '--font-mono': `'${brand.fonts.mono}', ${FALLBACK.mono}`,
  } as React.CSSProperties;
}

const loaded = new Set<string>();
export function useBrandFonts(brand: Brand) {
  useEffect(() => {
    for (const family of [brand.fonts.display, brand.fonts.body, brand.fonts.mono]) {
      if (!family || loaded.has(family)) continue;
      loaded.add(family);
      const name = encodeURIComponent(family).replace(/%20/g, '+');
      for (const href of [
        `https://fonts.googleapis.com/css2?family=${name}:wght@400;500;600;700;800&display=swap`,
        `https://fonts.googleapis.com/css2?family=${name}&display=swap`,
      ]) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    }
  }, [brand.fonts.display, brand.fonts.body, brand.fonts.mono]);
}

export function shaderColors(brand: Brand) {
  return brand.shader?.colors ?? [brand.colors.bg, brand.colors.accent3, brand.colors.accent2, brand.colors.accent, brand.colors.bg];
}

const COLOR = /^(#[0-9a-fA-F]{3,8}|(rgb|hsl|oklch|oklab)a?\([0-9.,%\s/-]+\))$/;
const FONT = /^[A-Za-z0-9 ]{2,40}$/;
export function sanitizeBrand(brand: any, fallback: Brand = DEEPLY_BRAND): Brand {
  if (!brand || typeof brand !== 'object') return fallback;
  const colors = Object.fromEntries(
    Object.entries(fallback.colors).map(([key, value]) => [key, typeof brand.colors?.[key] === 'string' && COLOR.test(brand.colors[key].trim()) ? brand.colors[key].trim() : value]),
  ) as Brand['colors'];
  const font = (fontKey: keyof Brand['fonts']) => (typeof brand.fonts?.[fontKey] === 'string' && FONT.test(brand.fonts[fontKey]) ? brand.fonts[fontKey] : fallback.fonts[fontKey]);
  const shaderColors = Array.isArray(brand.shader?.colors) ? brand.shader.colors.filter((color: unknown) => typeof color === 'string' && COLOR.test(color)) : [];
  return {
    name: typeof brand.name === 'string' ? brand.name.slice(0, 60) : fallback.name,
    colors,
    fonts: { display: font('display'), body: font('body'), mono: font('mono') },
    shader: ['mesh', 'grain', 'dither'].includes(brand.shader?.kind) && shaderColors.length >= 2 ? { kind: brand.shader.kind, colors: shaderColors.slice(0, 5) } : undefined,
    source: typeof brand.source === 'string' ? brand.source.slice(0, 200) : undefined,
  };
}

export function isLight(hex: string) {
  const match = /^#([0-9a-f]{6})/i.exec(hex);
  if (!match) return false;
  const rgbValue = parseInt(match[1], 16);
  const [red, green, blue] = [(rgbValue >> 16) & 255, (rgbValue >> 8) & 255, rgbValue & 255];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 150;
}
