import type { Metadata, Viewport } from '@farm.js/core';

const SITE_DESCRIPTION =
  'Open-source deep-dive courses on how things really work: animated diagrams, real source code, challenges, and a Simplify button for dense explanations. Generate a course from any topic or GitHub repo.';

export const siteMetadata: Metadata = {
  title: 'Deeply',
  description: SITE_DESCRIPTION,
  icons: '/favicon.svg',
  openGraph: {
    type: 'website',
    title: 'Deeply',
    description:
      'Learn anything, deeply. Interactive diagrams, real source code, challenges and plain-language rewrites on demand.',
    images: '/og.jpg'
  },
  twitter: { card: 'summary_large_image' }
};

export const siteViewport: Viewport = { themeColor: '#000000' };
