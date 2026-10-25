import type { Block, ModulePack } from '../../convex/lib/courseSchema';
import { FLOW_NODE_HEIGHT, FLOW_NODE_WIDTH } from './flowGeometry';
import { measureWidestLabelWord } from './flowLabels';
import { Callout, Check, Code } from './kit';
import { Compare, Copyable, Flow } from './kit';
import { KeyTerms, Section } from './kit';
import { Inline } from './md';

import type { FlowEdge, FlowNode } from '../types';

export function PackModule({ pack }: { pack: ModulePack }) {
  return (
    <>
      {pack.sections.map((section) => (
        <Section key={section.id} id={section.id} title={section.title}>
          {section.blocks.map((block, index) => (
            <PackBlock key={index} block={block} />
          ))}
        </Section>
      ))}
    </>
  );
}

const ROW_GAP = 132;
const MINIMUM_COLUMN_GAP = 72;
const MAXIMUM_COLUMN_GAP = 116;
const LABEL_CLEARANCE = 28;
const CANVAS_MARGIN = 24;
const MINIMUM_CANVAS_WIDTH = 1000;

export function layoutFlow(
  nodes: (Omit<FlowNode, 'x' | 'y'> & { x?: number; y?: number; col?: number; row?: number })[],
  edges: FlowEdge[]
) {
  const gridded = nodes.filter((node) => node.x === undefined || node.y === undefined);
  const cols = gridded.map((node) => node.col ?? 0);
  const minCol = Math.min(...cols, 0),
    maxCol = Math.max(...cols, 0);
  const span = maxCol - minCol;
  const columnGap = Math.min(
    MAXIMUM_COLUMN_GAP,
    Math.max(MINIMUM_COLUMN_GAP, measureWidestLabelWord(edges) + LABEL_CLEARANCE)
  );
  const canvasWidth = Math.max(
    MINIMUM_CANVAS_WIDTH,
    2 * CANVAS_MARGIN + span * (FLOW_NODE_WIDTH + columnGap) + FLOW_NODE_WIDTH
  );
  const placed: FlowNode[] = nodes.map((node) => {
    if (node.x !== undefined && node.y !== undefined) return node as FlowNode;
    const width = node.w ?? FLOW_NODE_WIDTH;
    const column = node.col ?? 0,
      row = node.row ?? 0;
    const x =
      span === 0
        ? (canvasWidth - width) / 2
        : CANVAS_MARGIN + ((column - minCol) / span) * (canvasWidth - 2 * CANVAS_MARGIN - width);
    return { ...node, w: width, h: node.h ?? FLOW_NODE_HEIGHT, x: Math.round(x), y: 28 + row * ROW_GAP } as FlowNode;
  });
  const bottom = Math.max(...placed.map((node) => node.y + (node.h ?? FLOW_NODE_HEIGHT)));
  return { nodes: placed, width: canvasWidth, height: Math.max(240, bottom + 36) };
}

export function PackBlock({ block: b }: { block: Block }) {
  switch (b.type) {
    case 'p':
      return (
        <p>
          <Inline text={b.text} />
        </p>
      );
    case 'h3':
      return (
        <h3>
          <Inline text={b.text} />
        </h3>
      );
    case 'list': {
      const items = b.items.map((item, index) => (
        <li key={index}>
          <Inline text={item} />
        </li>
      ));
      return b.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case 'callout':
      return (
        <Callout kind={b.kind} title={b.title}>
          <p>
            <Inline text={b.text} />
          </p>
        </Callout>
      );
    case 'keyterms':
      return <KeyTerms terms={b.terms.map((term) => ({ term: term.term, def: <Inline text={term.def} /> }))} />;
    case 'compare':
      return (
        <Compare
          caption={b.caption}
          head={b.head}
          rows={b.rows.map((row) => row.map((cell, cellIndex) => <Inline key={cellIndex} text={cell} />))}
        />
      );
    case 'code':
      return <Code title={b.title} lang={b.lang} code={b.code} note={b.note ? <Inline text={b.note} /> : undefined} />;
    case 'flow': {
      const { nodes, width, height } = layoutFlow(b.nodes, b.edges);
      return (
        <Flow
          title={b.title}
          nodes={nodes}
          edges={b.edges}
          steps={b.steps}
          width={width}
          height={b.height ?? height}
          caption={b.caption}
        />
      );
    }
    case 'check':
      return <Check question={b.q} options={b.options} answer={b.answer} explain={b.explain} />;
    default:
      return (
        <Copyable label="Unsupported block">
          <p className="muted">This block type isn't supported by this version of the app.</p>
        </Copyable>
      );
  }
}
