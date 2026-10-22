import type { BuiltinCourse } from '../course';

/** Minimal pack used to test the renderer. Shown only when localStorage["deeply-fixtures"] === "1". */
export const demoCourse: BuiltinCourse = {
  id: 'demo',
  title: 'Caches, Deeply',
  tagline: 'Fixture course for the pack renderer.',
  summary: 'A small course that exercises every block type.',
  kind: 'concept',
  format: 'pack',
  brand: {
    name: 'Caches',
    colors: { bg: '#000000', surface: '#0b0b0b', surface2: '#151515', fg: '#f2f2f2', fg2: '#cfcfcf', muted: '#8a8a8a', line: '#272727', accent: '#7ee0c3', accent2: '#ff9e6b', accent3: '#9b8cff', onAccent: '#00140e' },
    fonts: { display: 'Space Mono', body: 'Inter Tight', mono: 'IBM Plex Mono' },
    shader: { kind: 'grain', colors: ['#7ee0c3', '#9b8cff', '#ff9e6b'] },
    source: 'designed',
  },
  pack: {
    id: 'demo', title: 'Caches, Deeply', tagline: 'x', summary: 'x', kind: 'concept',
    brand: undefined as any,
    challenges: [
      { id: 'c1', topic: 'Basics', difficulty: 1, type: 'mcq', q: 'What does a **cache hit** mean?', options: ['The value was found in the cache', 'The cache crashed'], answer: 0, explain: 'A hit means the cache already had the value.' },
      { id: 'c2', topic: 'Invalidation', difficulty: 3, type: 'bug', q: 'Spot the bug.', code: 'cache.set(k, v)\ndb.write(k, v2)', options: ['The cache is never invalidated after the write', 'Nothing'], answer: 0, explain: 'The write leaves a stale value in the cache.', boss: true },
    ],
    modules: [
      {
        id: 'basics', n: 1, title: 'What a cache is', kicker: 'Foundations', minutes: 10, summary: 'Hits, misses and why caches exist.',
        sections: [
          { id: 's1', title: 'The idea', blocks: [
            { type: 'p', text: 'A cache keeps a **copy** of data closer to where it is used. See `get(key)` and [MDN](https://developer.mozilla.org).' },
            { type: 'list', items: ['Hits are fast', 'Misses go to the *origin*'] },
            { type: 'callout', kind: 'insight', title: 'Copies go stale', text: 'Every cache is a bet that the copy is still right.' },
            { type: 'keyterms', terms: [{ term: 'hit', def: 'Value found in the cache' }, { term: 'miss', def: 'Value fetched from the origin' }] },
            { type: 'compare', caption: 'Hit vs miss', head: ['', 'Hit', 'Miss'], rows: [['Latency', 'ns–µs', 'ms'], ['Source', 'cache', 'origin']] },
            { type: 'code', title: 'read-through cache', lang: 'ts', code: 'async function get(k: string) {\n  const hit = cache.get(k);\n  if (hit) return hit;\n  const v = await db.read(k);\n  cache.set(k, v);\n  return v;\n}', note: 'The read path fills the cache on a miss.' },
          ] },
          { id: 's2', title: 'A read, step by step', blocks: [
            { type: 'flow', title: 'Read-through cache', nodes: [
              { id: 'app', label: 'App', sub: 'get(key)', col: 0, row: 1, tone: 'yellow' },
              { id: 'cache', label: 'Cache', sub: 'in memory', col: 2, row: 0, tone: 'purple' },
              { id: 'db', label: 'Database', sub: 'origin', col: 4, row: 1, tone: 'red' },
              { id: 'log', label: 'Metrics', sub: 'hit ratio', col: 2, row: 2 },
            ], edges: [
              { id: 'a-c', from: 'app', to: 'cache', label: 'lookup' },
              { id: 'c-d', from: 'cache', to: 'db', label: 'miss → read' },
              { id: 'd-c', from: 'db', to: 'cache', label: 'fill' },
              { id: 'c-a', from: 'cache', to: 'app', label: 'value' },
              { id: 'c-l', from: 'cache', to: 'log', label: 'record' },
            ], steps: [
              { title: 'Lookup', text: 'The app asks the cache for `key`.', nodes: ['app', 'cache'], edges: ['a-c'] },
              { title: 'Miss', text: 'The cache does not have it and reads the **origin**.', nodes: ['cache', 'db'], edges: ['c-d'] },
              { title: 'Fill', text: 'The value is stored for next time.', nodes: ['db', 'cache'], edges: ['d-c', 'c-l'] },
              { title: 'Return', text: 'The app gets the value.', nodes: ['cache', 'app'], edges: ['c-a'] },
            ] },
            { type: 'check', q: 'After a miss, what does a read-through cache do?', options: ['Returns an error', 'Reads the origin and stores the value', 'Deletes the key'], answer: 1, explain: 'It fetches from the origin and fills itself.' },
          ] },
        ],
      },
    ],
  },
};
