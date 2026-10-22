import { z } from 'zod';


export const Tone = z.enum(['yellow', 'red', 'purple', 'plain']);

export const FlowNode = z.object({
  id: z.string(),
  label: z.string().describe('2-3 words'),
  sub: z.string().optional().describe('short monospace subtitle, <= 26 chars'),
  col: z.number().int().min(0).max(4).optional(),
  row: z.number().int().min(0).max(4).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  tone: Tone.optional(),
  code: z.array(z.string()).optional().describe('ids of codeRefs that implement this node'),
});

export const FlowEdge = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional().describe('<= 3 words'),
  curve: z.number().optional(),
  code: z.array(z.string()).optional(),
});

export const FlowStep = z.object({
  title: z.string(),
  text: z.string().describe('2-4 sentences explaining exactly what happens at this step'),
  nodes: z.array(z.string()).optional(),
  edges: z.array(z.string()).optional(),
});

export const Block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text: z.string() }),
  z.object({ type: z.literal('h3'), text: z.string() }),
  z.object({ type: z.literal('list'), ordered: z.boolean().optional(), items: z.array(z.string()) }),
  z.object({
    type: z.literal('callout'),
    kind: z.enum(['insight', 'warn', 'deep', 'analogy', 'rule']),
    title: z.string().optional(),
    text: z.string(),
  }),
  z.object({ type: z.literal('keyterms'), terms: z.array(z.object({ term: z.string(), def: z.string() })) }),
  z.object({
    type: z.literal('compare'),
    caption: z.string().optional(),
    head: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    type: z.literal('code'),
    title: z.string().optional(),
    lang: z.string(),
    code: z.string(),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('flow'),
    title: z.string(),
    height: z.number().optional(),
    caption: z.string().optional(),
    nodes: z.array(FlowNode).min(2).max(9),
    edges: z.array(FlowEdge),
    steps: z.array(FlowStep).min(3).max(9),
  }),
  z.object({
    type: z.literal('check'),
    q: z.string(),
    options: z.array(z.string()).min(2).max(5),
    answer: z.number().int().min(0),
    explain: z.string(),
  }),
]);
export type Block = z.infer<typeof Block>;

export const Section = z.object({ id: z.string(), title: z.string(), blocks: z.array(Block).min(1) });
export type Section = z.infer<typeof Section>;

export const ModulePack = z.object({
  id: z.string(),
  n: z.number().int(),
  title: z.string(),
  kicker: z.string(),
  minutes: z.number(),
  summary: z.string(),
  sections: z.array(Section).min(1),
});
export type ModulePack = z.infer<typeof ModulePack>;

export const Challenge = z.object({
  id: z.string(),
  topic: z.string(),
  difficulty: z.number().int().min(1).max(3),
  type: z.enum(['mcq', 'predict', 'bug']),
  q: z.string(),
  code: z.string().optional(),
  options: z.array(z.string()).min(2).max(5),
  answer: z.number().int().min(0),
  explain: z.string(),
  boss: z.boolean().optional(),
});
export type Challenge = z.infer<typeof Challenge>;

export const Brand = z.object({
  name: z.string().describe('display name, e.g. "Convex" or "CRDTs"'),
  colors: z.object({
    bg: z.string(),
    surface: z.string(),
    surface2: z.string(),
    fg: z.string(),
    fg2: z.string(),
    muted: z.string(),
    line: z.string(),
    accent: z.string().describe('primary brand color'),
    accent2: z.string(),
    accent3: z.string(),
    onAccent: z.string().describe('text color on accent'),
  }),
  fonts: z.object({
    display: z.string().describe('Google Fonts family name'),
    body: z.string(),
    mono: z.string(),
  }),
  shader: z
    .object({ kind: z.enum(['mesh', 'grain', 'dither']), colors: z.array(z.string()).min(2).max(5) })
    .optional(),
  logoSvg: z.string().optional().describe('inline SVG markup, square viewBox'),
  source: z.string().optional().describe('where the brand came from (URL of brand guidelines) or "designed"'),
});
export type Brand = z.infer<typeof Brand>;

export const CodeRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  repo: z.string().describe('owner/name'),
  sha: z.string(),
  path: z.string(),
  startLine: z.number().int(),
  endLine: z.number().int(),
  symbol: z.string(),
  lang: z.string(),
  summary: z.string(),
  explain: z.string(),
  notes: z.array(z.object({ line: z.number().int(), text: z.string() })).optional(),
  code: z.string(),
});
export type CodeRefPack = z.infer<typeof CodeRefSchema>;

export const CourseMeta = z.object({
  id: z.string(),
  title: z.string().describe('e.g. "CRDTs, Deeply"'),
  tagline: z.string(),
  summary: z.string(),
  kind: z.enum(['concept', 'repo']),
  brand: Brand,
  challenges: z.array(Challenge),
  codeRefs: z.record(z.string(), CodeRefSchema).optional(),
});
export type CourseMeta = z.infer<typeof CourseMeta>;

export const CoursePack = CourseMeta.extend({ modules: z.array(ModulePack).min(1) });
export type CoursePack = z.infer<typeof CoursePack>;

export function lintModule(pack: ModulePack, codeRefIds: Set<string> = new Set()): string[] {
  const errs: string[] = [];
  for (const section of pack.sections) for (const block of section.blocks) {
    if (block.type === 'check' && block.answer >= block.options.length) errs.push(`${pack.id}/${section.id}: check answer out of range`);
    if (block.type === 'flow') {
      const ids = new Set(block.nodes.map((node) => node.id));
      const eids = new Set(block.edges.map((edge) => edge.id));
      for (const flowEdge of block.edges) if (!ids.has(flowEdge.from) || !ids.has(flowEdge.to)) errs.push(`${pack.id}/${section.id}: flow "${block.title}" edge ${flowEdge.id} references unknown node`);
      for (const step of block.steps) {
        for (const nodeID of step.nodes ?? []) if (!ids.has(nodeID)) errs.push(`${pack.id}/${section.id}: flow step references unknown node ${nodeID}`);
        for (const edgeID of step.edges ?? []) if (!eids.has(edgeID)) errs.push(`${pack.id}/${section.id}: flow step references unknown edge ${edgeID}`);
      }
      for (const flowNode of block.nodes) {
        if (flowNode.x === undefined && (flowNode.col === undefined || flowNode.row === undefined)) errs.push(`${pack.id}/${section.id}: node ${flowNode.id} has no position`);
        for (const codeRefID of flowNode.code ?? []) if (!codeRefIds.has(codeRefID)) errs.push(`${pack.id}: unknown code ref ${codeRefID}`);
      }
      const cells = new Set<string>();
      for (const gridNode of block.nodes) if (gridNode.col !== undefined) {
        const cellKey = `${gridNode.col},${gridNode.row}`;
        if (cells.has(cellKey)) errs.push(`${pack.id}/${section.id}: two nodes share grid cell ${cellKey}`);
        cells.add(cellKey);
      }
    }
    if (block.type === 'compare') for (const row of block.rows) if (row.length !== block.head.length) errs.push(`${pack.id}/${section.id}: compare row has ${row.length} cells, header has ${block.head.length}`);
  }
  return errs;
}
