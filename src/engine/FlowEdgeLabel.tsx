import { EDGE_LABEL_LINE_HEIGHT } from './flowLabels';

import type { FlowLabelPlacement } from '../types';

interface FlowEdgeLabelProps {
  label: FlowLabelPlacement;
  isActive: boolean;
  onOpenCode?: () => void;
}

export const FlowEdgeLabel = ({ label, isActive, onOpenCode }: FlowEdgeLabelProps) => (
  <g className={`edge ${isActive ? 'on' : ''} ${onOpenCode ? 'has-code' : ''}`} onClick={onOpenCode}>
    <text x={label.x} y={label.y} className="edge-label" textAnchor={label.anchor} dominantBaseline="middle">
      {label.lines.map((line, lineIndex) => (
        <tspan
          key={line}
          x={label.x}
          dy={lineIndex === 0 ? -((label.lines.length - 1) * EDGE_LABEL_LINE_HEIGHT) / 2 : EDGE_LABEL_LINE_HEIGHT}
        >
          {line.replace(/ ?<\/>$/, '')}
          {line.endsWith('</>') && <tspan className="code-mark">{line === '</>' ? '</>' : ' </>'}</tspan>}
        </tspan>
      ))}
    </text>
  </g>
);
