import type { BuiltinCourse } from '../../engine/course';
import './code/index';
import { LiveLab } from './LiveLab';
import { modules } from './modules';
import { Playground } from './playground/Playground';
import { SourceMap } from './SourceMap';

export const convexCourse: BuiltinCourse = {
  id: 'convex',
  title: 'Convex, Deeply',
  tagline: 'How Convex actually works.',
  summary:
    'From the transaction log to the WebSocket. The database, the function runtime, optimistic concurrency, the subscription engine and the sync protocol, built up from first principles, then tested in a playground and against a live deployment.',
  kind: 'repo',
  format: 'react',
  modules,
  pages: [
    { id: 'playground', label: 'Playground & challenges', Component: Playground },
    { id: 'lab', label: 'Live Lab', badge: 'live', Component: LiveLab },
    { id: 'source', label: 'Source map', Component: SourceMap }
  ],
  brand: {
    name: 'Convex',
    colors: {
      bg: '#000000',
      surface: '#0a0a0a',
      surface2: '#121212',
      fg: '#f5f5f5',
      fg2: '#d4d4d4',
      muted: '#8f8f8f',
      line: '#262626',
      accent: '#F3B01C',
      accent2: '#EE342F',
      accent3: '#8D2676',
      onAccent: '#1a1205'
    },
    fonts: { display: 'Bricolage Grotesque', body: 'Geist', mono: 'JetBrains Mono' },
    shader: { kind: 'mesh', colors: ['#000000', '#8D2676', '#EE342F', '#F3B01C', '#000000'] },
    logoSvg:
      '<svg viewBox="0 0 64 64"><path d="M40.6 48.7c7.3-.8 14.2-4.6 18-11-1.8 15.8-19.6 25.8-34.1 19.6a7.3 7.3 0 0 1-3-2.6c-3.2-5-4.3-11.4-2.8-17.1 4.3 7.3 13.1 11.8 21.9 11.1Z" fill="#F3B01C"/><path d="M18.3 32.3c-3 6.9-3.2 14.9.5 21.5-13-9.6-12.8-30.2-.1-39.7a7.1 7.1 0 0 1 3.7-1.4c5.9-.3 11.9 1.9 16.1 6.1-8.5.1-16.7 5.5-20.2 13.5Z" fill="#8D2676"/><path d="M44.8 20.6c-4.3-5.9-11-9.9-18.4-10 14.2-6.4 31.6 3.9 33.5 19.2.2 1.4 0 2.9-.6 4.2-2.6 5.2-7.5 9.2-13 10.6 4-7.3 3.5-16.2-1.5-24Z" fill="#EE342F"/></svg>',
    source: 'https://www.convex.dev/brand'
  }
};
