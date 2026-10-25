import type { FlowBox, FlowNode, FlowNodeBox } from '../types';
import type { FlowPoint, FlowSegment, FlowSide } from '../types';

export const FLOW_NODE_WIDTH = 170;
export const FLOW_NODE_HEIGHT = 64;
const CORNER_RADIUS = 10;
const ALIGNMENT_TOLERANCE = 0.5;

export function measureNode(node: FlowNode): FlowNodeBox {
  const width = node.w ?? FLOW_NODE_WIDTH;
  const height = node.h ?? FLOW_NODE_HEIGHT;
  return {
    left: node.x,
    top: node.y,
    right: node.x + width,
    bottom: node.y + height,
    centerX: node.x + width / 2,
    centerY: node.y + height / 2
  };
}

export function inflateBox<Box extends FlowBox>(box: Box, padding: number): Box {
  return {
    ...box,
    left: box.left - padding,
    top: box.top - padding,
    right: box.right + padding,
    bottom: box.bottom + padding
  };
}

export function isHorizontalSide(side: FlowSide): boolean {
  return side === 'left' || side === 'right';
}

export function findPort(box: FlowNodeBox, side: FlowSide, offset: number): FlowPoint {
  if (side === 'left') return { x: box.left, y: box.centerY + offset };
  if (side === 'right') return { x: box.right, y: box.centerY + offset };
  if (side === 'top') return { x: box.centerX + offset, y: box.top };
  return { x: box.centerX + offset, y: box.bottom };
}

function arePointsEqual(first: FlowPoint, second: FlowPoint): boolean {
  return Math.abs(first.x - second.x) < ALIGNMENT_TOLERANCE && Math.abs(first.y - second.y) < ALIGNMENT_TOLERANCE;
}

function arePointsCollinear(first: FlowPoint, middle: FlowPoint, last: FlowPoint): boolean {
  const isVerticalLine =
    Math.abs(first.x - middle.x) < ALIGNMENT_TOLERANCE && Math.abs(middle.x - last.x) < ALIGNMENT_TOLERANCE;
  const isHorizontalLine =
    Math.abs(first.y - middle.y) < ALIGNMENT_TOLERANCE && Math.abs(middle.y - last.y) < ALIGNMENT_TOLERANCE;
  return isVerticalLine || isHorizontalLine;
}

export function simplifyPoints(points: FlowPoint[]): FlowPoint[] {
  const simplified: FlowPoint[] = [];
  for (const point of points) {
    const last = simplified[simplified.length - 1];
    if (last && arePointsEqual(last, point)) continue;
    const beforeLast = simplified[simplified.length - 2];
    if (beforeLast && arePointsCollinear(beforeLast, last, point)) simplified.pop();
    simplified.push(point);
  }
  return simplified;
}

export function listSegments(points: FlowPoint[]): FlowSegment[] {
  return points.slice(1).map((end, index) => ({ start: points[index], end }));
}

export function measureSegment(segment: FlowSegment): number {
  return Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
}

export function isHorizontalSegment(segment: FlowSegment): boolean {
  return Math.abs(segment.start.y - segment.end.y) < ALIGNMENT_TOLERANCE;
}

export function boxesOverlap(first: FlowBox, second: FlowBox): boolean {
  return (
    first.left < second.right && second.left < first.right && first.top < second.bottom && second.top < first.bottom
  );
}

export function segmentCrossesBox(segment: FlowSegment, box: FlowBox): boolean {
  const segmentBox = {
    left: Math.min(segment.start.x, segment.end.x),
    top: Math.min(segment.start.y, segment.end.y),
    right: Math.max(segment.start.x, segment.end.x),
    bottom: Math.max(segment.start.y, segment.end.y)
  };
  return boxesOverlap(segmentBox, box);
}

export function pickCheapest<Item>(items: Item[], measureCost: (item: Item) => number): Item {
  let cheapest = items[0];
  let cheapestCost = measureCost(cheapest);
  for (const item of items.slice(1)) {
    const cost = measureCost(item);
    if (cost >= cheapestCost) continue;
    cheapest = item;
    cheapestCost = cost;
  }
  return cheapest;
}

function moveToward(from: FlowPoint, to: FlowPoint, distance: number): FlowPoint {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: from.x + ((to.x - from.x) / length) * distance, y: from.y + ((to.y - from.y) / length) * distance };
}

export function pullBackEnd(points: FlowPoint[], distance: number): FlowPoint[] {
  const last = points[points.length - 1];
  return [...points.slice(0, -1), moveToward(last, points[points.length - 2], distance)];
}

function formatPoint(point: FlowPoint): string {
  return `${Math.round(point.x * 10) / 10},${Math.round(point.y * 10) / 10}`;
}

export function buildRoundedPath(points: FlowPoint[]): string {
  const commands = [`M${formatPoint(points[0])}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const corner = points[index];
    const radius = Math.min(
      CORNER_RADIUS,
      measureSegment({ start: points[index - 1], end: corner }) / 2,
      measureSegment({ start: corner, end: points[index + 1] }) / 2
    );
    const entry = moveToward(corner, points[index - 1], radius);
    const exit = moveToward(corner, points[index + 1], radius);
    commands.push(`L${formatPoint(entry)}`, `Q${formatPoint(corner)} ${formatPoint(exit)}`);
  }
  commands.push(`L${formatPoint(points[points.length - 1])}`);
  return commands.join(' ');
}
