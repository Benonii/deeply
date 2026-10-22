import React from 'react';
import { Dithering, GrainGradient, MeshGradient } from '@paper-design/shaders-react';
import type { Brand } from '../../convex/lib/courseSchema';
import { shaderColors } from '../engine/theme';

const full = { width: '100%', height: '100%' };
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The brand's shader, in one of three roles: page hero, module header band, or footer texture. */
export function BrandShader({ brand, role, seed = 0 }: { brand: Brand; role: 'hero' | 'band' | 'foot'; seed?: number }) {
  const colors = shaderColors(brand);
  const speed = reduced ? 0 : role === 'hero' ? 0.25 : 0.35;
  const kind = brand.shader?.kind ?? 'mesh';
  if (role === 'foot' || kind === 'dither') {
    return <Dithering colorBack={brand.colors.bg} colorFront={role === 'foot' ? brand.colors.accent : colors[colors.length > 2 ? 1 : colors.length - 1]} shape="warp" type="4x4" size={2} speed={speed} style={full} />;
  }
  if (role === 'band' || kind === 'grain') {
    const rotatedColors = [0, 1, 2].map((offset) => colors[(offset + seed) % colors.length]).filter((color) => color.toLowerCase() !== brand.colors.bg.toLowerCase());
    return <GrainGradient colorBack={brand.colors.bg} colors={rotatedColors.length >= 2 ? rotatedColors : [brand.colors.accent, brand.colors.accent3]} softness={0.7} intensity={0.35} noise={0.3} shape="wave" speed={speed} style={full} />;
  }
  return <MeshGradient colors={colors} distortion={0.85} swirl={0.6} grainOverlay={0.25} speed={speed} style={full} />;
}
