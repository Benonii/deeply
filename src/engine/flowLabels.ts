import { boxesOverlap, isHorizontalSegment, listSegments } from './flowGeometry';
import { measureSegment, pickCheapest, segmentCrossesBox } from './flowGeometry';

import type { FlowBounds, FlowBox, FlowEdge } from '../types';
import type { FlowLabelCandidate, FlowLabelPlacement, FlowPoint } from '../types';
import type { FlowSegment } from '../types';

const LABEL_CHARACTER_WIDTH = 6.9;
export const EDGE_LABEL_LINE_HEIGHT = 14;
const LABEL_GAP = 6;
const LABEL_PADDING = 3;
const LABEL_FRACTIONS = [0.5, 0.35, 0.65, 0.2, 0.8];
const MINIMUM_LABEL_SEGMENT = 20;
const OVERLAP_COST = 100;
const LINE_COST = 25;

export function describeEdgeLabel(edge: FlowEdge): string {
  const codeMark = edge.code?.length ? '</>' : '';
  if (!edge.label) return codeMark;
  return codeMark ? `${edge.label} ${codeMark}` : edge.label;
}

function pointAlong(segment: FlowSegment, fraction: number): FlowPoint {
  return {
    x: segment.start.x + (segment.end.x - segment.start.x) * fraction,
    y: segment.start.y + (segment.end.y - segment.start.y) * fraction
  };
}

function measureLines(lines: string[]): number {
  return Math.max(...lines.map((line) => line.length)) * LABEL_CHARACTER_WIDTH;
}

function splitLabelWords(text: string): string[] {
  const words = text.split(' ');
  if (words.length < 2 || words[words.length - 1] !== '</>') return words;
  return [...words.slice(0, -2), `${words[words.length - 2]} </>`];
}

export function measureWidestLabelWord(edges: FlowEdge[]): number {
  const words = edges.flatMap((edge) => splitLabelWords(describeEdgeLabel(edge)));
  return Math.max(0, ...words.map((word) => word.length * LABEL_CHARACTER_WIDTH));
}

function wrapLabel(text: string, maximumWidth: number): string[] {
  const lines: string[] = [];
  for (const word of splitLabelWords(text)) {
    const current = lines[lines.length - 1];
    const fitsOnCurrentLine =
      current !== undefined && `${current} ${word}`.length * LABEL_CHARACTER_WIDTH <= maximumWidth;
    if (fitsOnCurrentLine) lines[lines.length - 1] = `${current} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function boxAroundLabel(placement: FlowLabelPlacement): FlowBox {
  const width = measureLines(placement.lines);
  const height = placement.lines.length * EDGE_LABEL_LINE_HEIGHT;
  const left =
    placement.anchor === 'start'
      ? placement.x
      : placement.anchor === 'end'
        ? placement.x - width
        : placement.x - width / 2;
  return {
    left: left - LABEL_PADDING,
    top: placement.y - height / 2,
    right: left + width + LABEL_PADDING,
    bottom: placement.y + height / 2
  };
}

function placeBesideSegment(segment: FlowSegment, fraction: number, side: number, text: string): FlowLabelPlacement {
  const point = pointAlong(segment, fraction);
  if (!isHorizontalSegment(segment))
    return { x: point.x + side * (LABEL_GAP + 2), y: point.y, anchor: side > 0 ? 'start' : 'end', lines: [text] };
  const lines = wrapLabel(text, measureSegment(segment) - 12);
  const height = lines.length * EDGE_LABEL_LINE_HEIGHT;
  return { x: point.x, y: point.y + side * (height / 2 + LABEL_GAP), anchor: 'middle', lines };
}

function scorePlacementPreference(segment: FlowSegment, placement: FlowLabelPlacement, fraction: number, side: number) {
  const length = measureSegment(segment);
  const isHorizontal = isHorizontalSegment(segment);
  const extent = isHorizontal ? measureLines(placement.lines) : placement.lines.length * EDGE_LABEL_LINE_HEIGHT;
  const spillsPastSegment = extent + 12 > length;
  return (
    Math.abs(fraction - 0.5) +
    (side > 0 ? 0.3 : 0) +
    (isHorizontal ? 0 : 0.6) +
    (spillsPastSegment ? 2 : 0) +
    (placement.lines.length - 1) * 0.4
  );
}

function listLabelCandidates(points: FlowPoint[], text: string): FlowLabelCandidate[] {
  const allSegments = listSegments(points);
  const longSegments = allSegments.filter((segment) => measureSegment(segment) >= MINIMUM_LABEL_SEGMENT);
  return (longSegments.length ? longSegments : allSegments).flatMap((segment) =>
    LABEL_FRACTIONS.flatMap((fraction) =>
      [-1, 1].map((side) => {
        const placement = placeBesideSegment(segment, fraction, side, text);
        return {
          placement,
          box: boxAroundLabel(placement),
          baseCost: scorePlacementPreference(segment, placement, fraction, side)
        };
      })
    )
  );
}

function isOutOfBounds(box: FlowBox, bounds: FlowBounds): boolean {
  return box.left < 0 || box.top < 0 || box.right > bounds.width || box.bottom > bounds.height;
}

function scoreLabel(
  candidate: FlowLabelCandidate,
  obstacles: FlowBox[],
  segments: FlowSegment[],
  bounds: FlowBounds
): number {
  const overlapCount = obstacles.filter((box) => boxesOverlap(candidate.box, box)).length;
  const lineCount = segments.filter((segment) => segmentCrossesBox(segment, candidate.box)).length;
  const outOfBoundsCost = isOutOfBounds(candidate.box, bounds) ? OVERLAP_COST : 0;
  return candidate.baseCost + overlapCount * OVERLAP_COST + lineCount * LINE_COST + outOfBoundsCost;
}

export function placeLabels(
  edges: FlowEdge[],
  routes: FlowPoint[][],
  nodeBoxes: FlowBox[],
  bounds: FlowBounds
): (FlowLabelPlacement | null)[] {
  const segments = routes.flatMap(listSegments);
  const placedBoxes: FlowBox[] = [];
  return edges.map((edge, index) => {
    const text = describeEdgeLabel(edge);
    const candidates = listLabelCandidates(routes[index], text);
    if (!text || !candidates.length) return null;
    const best = pickCheapest(candidates, (candidate) =>
      scoreLabel(candidate, [...nodeBoxes, ...placedBoxes], segments, bounds)
    );
    placedBoxes.push(best.box);
    return best.placement;
  });
}
