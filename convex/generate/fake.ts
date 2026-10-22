/**
 * GENERATOR_FAKE=1: deterministic fixtures so the whole pipeline can be
 * exercised without an Anthropic API key. Everything here must pass the
 * same validators as real output.
 */
import type { ModuleOutline, ModuleOutput, PlanOutput } from './shapes';

export const isFake = () => process.env.GENERATOR_FAKE === '1';

export function fakePlan(topic: string, kind: 'concept' | 'repo', files: string[]): PlanOutput {
  const subject = topic.replace(/^https?:\/\/github\.com\//, '').slice(0, 40);
  const courseModule = (moduleNumber: number, id: string, title: string): ModuleOutline => ({
    id,
    title,
    kicker: `Fixture module ${moduleNumber}`,
    summary: `A placeholder module about ${title.toLowerCase()} used to test the generator.`,
    minutes: 20,
    plan: '- intro\n- one flow diagram\n- one check',
    files: kind === 'repo' ? files.slice(0, 2) : [],
  });
  return {
    meta: { title: `${subject}, Deeply`, tagline: `Test course for ${subject}`, summary: 'Generated in GENERATOR_FAKE mode. Content is placeholder text.' },
    brand: {
      name: subject,
      colors: {
        bg: '#000000', surface: '#0a0a0a', surface2: '#141414', fg: '#f5f5f5', fg2: '#d4d4d4', muted: '#8f8f8f', line: '#262626',
        accent: '#4fd1c5', accent2: '#f6ad55', accent3: '#b794f4', onAccent: '#000000',
      },
      fonts: { display: 'Space Grotesk', body: 'Inter', mono: 'JetBrains Mono' },
      shader: { kind: 'mesh', colors: ['#000000', '#4fd1c5', '#b794f4'] },
      source: 'designed',
    },
    modules: [courseModule(1, 'mental-model', 'The mental model'), courseModule(2, 'internals', 'Internals'), courseModule(3, 'patterns', 'Patterns')],
  };
}

export function fakeModule(outline: ModuleOutline, moduleNumber: number, firstFile?: { path: string; text: string }): ModuleOutput {
  const refs: ModuleOutput['codeRefs'] = firstFile
    ? [{
        id: `${outline.id}.entry`,
        title: `Entry point of ${firstFile.path}`,
        path: firstFile.path,
        startLine: 1,
        endLine: Math.min(20, firstFile.text.split('\n').length),
        firstLine: firstFile.text.split('\n')[0],
        symbol: firstFile.path.split('/').pop() ?? firstFile.path,
        summary: 'The first lines of a real file, quoted verbatim.',
        explain: 'Fixture excerpt used to test verbatim code resolution.',
      }]
    : [];
  return {
    id: outline.id,
    n: moduleNumber,
    title: outline.title,
    kicker: outline.kicker,
    minutes: outline.minutes,
    summary: outline.summary,
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        blocks: [
          { type: 'p', text: `This is **fixture** content for *${outline.title}*. It exercises every block type with \`inline code\`.` },
          { type: 'callout', kind: 'insight', title: 'Fixture insight', text: 'Real generations replace this.' },
          { type: 'keyterms', terms: [{ term: 'Fixture', def: 'Deterministic test data.' }] },
          {
            type: 'flow',
            title: 'A request, step by step',
            nodes: [
              { id: 'a', label: 'Client', col: 0, row: 1, tone: 'yellow' },
              { id: 'b', label: 'Server', col: 2, row: 1, tone: 'red', code: refs.length ? [refs[0].id] : undefined },
              { id: 'c', label: 'Store', col: 4, row: 1, tone: 'purple' },
            ],
            edges: [
              { id: 'ab', from: 'a', to: 'b', label: 'request' },
              { id: 'bc', from: 'b', to: 'c', label: 'write' },
              { id: 'ba', from: 'b', to: 'a', label: 'reply' },
            ],
            steps: [
              { title: 'Send', text: 'The client sends a request.', nodes: ['a'], edges: ['ab'] },
              { title: 'Handle', text: 'The server handles it.', nodes: ['b'] },
              { title: 'Persist', text: 'The server writes to the store.', nodes: ['b', 'c'], edges: ['bc'] },
              { title: 'Reply', text: 'The server replies.', nodes: ['a', 'b'], edges: ['ba'] },
            ],
          },
          { type: 'check', q: 'What does the server do after handling the request?', options: ['Writes to the store', 'Deletes the client', 'Nothing'], answer: 0, explain: 'Step 3 persists the write.' },
        ],
      },
      {
        id: 'details',
        title: 'Details',
        blocks: [
          { type: 'list', items: ['First point', 'Second point'] },
          { type: 'compare', head: ['Option', 'Trade-off'], rows: [['A', 'Fast'], ['B', 'Safe']] },
          { type: 'code', lang: 'ts', title: 'example.ts', code: 'export const answer = 42;' },
        ],
      },
    ],
    codeRefs: refs,
  };
}

export function fakeChallenges(modules: { title: string }[]) {
  return {
    challenges: Array.from({ length: 6 }, (_, index) => ({
      id: `fx-${index + 1}`,
      topic: modules[index % modules.length]?.title ?? 'General',
      difficulty: ((index % 3) + 1) as 1 | 2 | 3,
      type: 'mcq' as const,
      q: `Fixture question ${index + 1}?`,
      options: ['Right', 'Wrong', 'Also wrong'],
      answer: 0,
      explain: 'Fixture explanation.',
      boss: index >= 4,
    })),
  };
}
