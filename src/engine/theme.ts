import { useEffect } from 'react';
import type React from 'react';
import type { Brand } from '../../convex/lib/courseSchema';

/** Platform chrome: pitch black, neutral greys, one cool accent. */
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

/** Brand → the CSS custom properties the engine styles read. */
export function brandVars(b: Brand): React.CSSProperties {
  const c = b.colors;
  return {
    '--bg': c.bg,
    '--bg2': c.surface,
    '--panel': c.surface2,
    '--panel2': `color-mix(in oklab, ${c.surface2} 82%, ${c.fg})`,
    '--fg': c.fg,
    '--fg2': c.fg2,
    '--muted': c.muted,
    '--line': c.line,
    '--line2': `color-mix(in oklab, ${c.line} 75%, ${c.fg})`,
    '--accent': c.accent,
    '--accent2': c.accent2,
    '--accent3': c.accent3,
    '--on-accent': c.onAccent,
    '--font-display': `'${b.fonts.display}', ${FALLBACK.display}`,
    '--font-body': `'${b.fonts.body}', ${FALLBACK.body}`,
    '--font-mono': `'${b.fonts.mono}', ${FALLBACK.mono}`,
  } as React.CSSProperties;
}

const loaded = new Set<string>();
/** Loads a brand's Google Fonts once. Each family gets its own link so one bad name can't block the others. */
export function useBrandFonts(b: Brand) {
  useEffect(() => {
    for (const family of [b.fonts.display, b.fonts.body, b.fonts.mono]) {
      if (!family || loaded.has(family)) continue;
      loaded.add(family);
      const name = encodeURIComponent(family).replace(/%20/g, '+');
      // Weighted request first; a plain request as a fallback for fonts without those weights.
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
  }, [b.fonts.display, b.fonts.body, b.fonts.mono]);
}

/** Shader palette for a brand: explicit, or derived from its colors. */
export function shaderColors(b: Brand) {
  return b.shader?.colors ?? [b.colors.bg, b.colors.accent3, b.colors.accent2, b.colors.accent, b.colors.bg];
}

const COLOR = /^(#[0-9a-fA-F]{3,8}|(rgb|hsl|oklch|oklab)a?\([0-9.,%\s/-]+\))$/;
const FONT = /^[A-Za-z0-9 ]{2,40}$/;
/** Untrusted brands (generated courses): keep only well-formed colors and font names, drop the logo. */
export function sanitizeBrand(b: any, fallback: Brand = DEEPLY_BRAND): Brand {
  if (!b || typeof b !== 'object') return fallback;
  const colors = Object.fromEntries(
    Object.entries(fallback.colors).map(([k, v]) => [k, typeof b.colors?.[k] === 'string' && COLOR.test(b.colors[k].trim()) ? b.colors[k].trim() : v]),
  ) as Brand['colors'];
  const font = (k: keyof Brand['fonts']) => (typeof b.fonts?.[k] === 'string' && FONT.test(b.fonts[k]) ? b.fonts[k] : fallback.fonts[k]);
  const shaderColors = Array.isArray(b.shader?.colors) ? b.shader.colors.filter((c: unknown) => typeof c === 'string' && COLOR.test(c)) : [];
  return {
    name: typeof b.name === 'string' ? b.name.slice(0, 60) : fallback.name,
    colors,
    fonts: { display: font('display'), body: font('body'), mono: font('mono') },
    shader: ['mesh', 'grain', 'dither'].includes(b.shader?.kind) && shaderColors.length >= 2 ? { kind: b.shader.kind, colors: shaderColors.slice(0, 5) } : undefined,
    source: typeof b.source === 'string' ? b.source.slice(0, 200) : undefined,
  };
}

/** Whether a background is light (so native controls and scrollbars should be light too). */
export function isLight(hex: string) {
  const m = /^#([0-9a-f]{6})/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}
