import type { Brand } from './courseSchema';

const HEX = /^#([0-9a-f]{6})$/i;
const WHITE = '#ffffff';
const BLACK = '#000000';
const TEXT_CONTRAST = 4.5;
const BODY_CONTRAST = 7;
const SHADER_MAX_LUMINANCE = 0.08;
const SHADER_CEILING = '#4f4f4f';
const MIX_STEP = 0.05;

function readChannels(hex: string): [number, number, number] | null {
  const match = HEX.exec(hex);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function writeHex(channels: number[]): string {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function linearize(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function isNeutralColor(hex: string): boolean {
  const channels = readChannels(hex);
  if (!channels) return false;
  return Math.max(...channels) - Math.min(...channels) <= 24;
}

export function measureLuminance(hex: string): number | null {
  const channels = readChannels(hex);
  if (!channels) return null;
  const [red, green, blue] = channels.map(linearize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function measureContrast(first: string, second: string): number | null {
  const firstLuminance = measureLuminance(first);
  const secondLuminance = measureLuminance(second);
  if (firstLuminance === null || secondLuminance === null) return null;
  const [lighter, darker] = [firstLuminance, secondLuminance].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixColors(from: string, to: string, amount: number): string {
  const fromChannels = readChannels(from);
  const toChannels = readChannels(to);
  if (!fromChannels || !toChannels) return from;
  return writeHex(fromChannels.map((channel, index) => channel + (toChannels[index] - channel) * amount));
}

export function ensureContrast(color: string, against: string, minimum: number): string {
  const againstLuminance = measureLuminance(against);
  if (againstLuminance === null || measureLuminance(color) === null) return color;
  const target = againstLuminance > 0.18 ? BLACK : WHITE;
  for (let amount = 0; amount <= 1; amount += MIX_STEP) {
    const candidate = mixColors(color, target, amount);
    if ((measureContrast(candidate, against) ?? 0) >= minimum) return candidate;
  }
  return target;
}

function darkenForText(color: string): string {
  for (let amount = 0; amount <= 1; amount += MIX_STEP) {
    const candidate = mixColors(color, BLACK, amount);
    if ((measureLuminance(candidate) ?? 0) <= SHADER_MAX_LUMINANCE) return candidate;
  }
  return BLACK;
}

function convertToGrey(color: string): string {
  const luminance = measureLuminance(color);
  if (luminance === null) return color;
  const scaled = luminance <= 0.0031308 ? luminance * 12.92 : 1.055 * luminance ** (1 / 2.4) - 0.055;
  const channel = Math.round(scaled * 255);
  return writeHex([channel, channel, channel]);
}

export function makeBrandMonochrome(brand: Brand): Brand {
  const { accent, accent2, accent3 } = brand.colors;
  return {
    ...brand,
    colors: {
      ...brand.colors,
      accent: convertToGrey(accent),
      accent2: convertToGrey(accent2),
      accent3: convertToGrey(accent3),
      onAccent: pickTextOn(convertToGrey(accent))
    },
    shader: { kind: brand.shader?.kind ?? 'mesh', colors: listShaderColors(brand).map(convertToGrey) }
  };
}

export function listShaderColors(brand: Brand): string[] {
  const { bg, accent, accent2, accent3 } = brand.colors;
  return brand.shader?.colors ?? [bg, accent3, accent2, accent, bg];
}

function pickTextOn(color: string): string {
  return (measureContrast(BLACK, color) ?? 0) >= (measureContrast(WHITE, color) ?? 0) ? BLACK : WHITE;
}

export function makeBrandReadable(brand: Brand): Brand {
  const { bg } = brand.colors;
  const isDarkTheme = (measureLuminance(bg) ?? 0) <= 0.18;
  const accentBase = isDarkTheme ? SHADER_CEILING : bg;
  const accent = ensureContrast(ensureContrast(brand.colors.accent, accentBase, TEXT_CONTRAST), bg, TEXT_CONTRAST);
  const shaderColors = listShaderColors(brand);
  return {
    ...brand,
    colors: {
      ...brand.colors,
      fg: ensureContrast(brand.colors.fg, bg, BODY_CONTRAST),
      fg2: ensureContrast(brand.colors.fg2, bg, TEXT_CONTRAST),
      muted: ensureContrast(brand.colors.muted, bg, TEXT_CONTRAST),
      accent,
      accent2: ensureContrast(brand.colors.accent2, bg, TEXT_CONTRAST),
      accent3: ensureContrast(brand.colors.accent3, bg, TEXT_CONTRAST),
      onAccent: pickTextOn(accent)
    },
    shader: {
      kind: brand.shader?.kind ?? 'mesh',
      colors: isDarkTheme ? shaderColors.map(darkenForText) : shaderColors
    }
  };
}
