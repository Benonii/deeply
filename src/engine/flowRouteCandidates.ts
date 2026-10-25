import { findPort, isHorizontalSide, simplifyPoints } from './flowGeometry';

import type { FlowNodeBox, FlowPoint, FlowRouteCandidate, FlowSide } from '../types';

export const MINIMUM_STUB = 16;
export const PORT_CORNER_MARGIN = 14;
const SIDES: FlowSide[] = ['right', 'left', 'bottom', 'top'];
const FACING_SIDES: [FlowSide, FlowSide][] = [
  ['right', 'left'],
  ['left', 'right'],
  ['bottom', 'top'],
  ['top', 'bottom']
];
const CHANNEL_SHIFTS = [0, -14, 14, -28, 28];
const LOOP_CLEARANCES = [30, 46];

function measureGap(source: FlowNodeBox, target: FlowNodeBox, startSide: FlowSide): number {
  if (startSide === 'right') return target.left - source.right;
  if (startSide === 'left') return source.left - target.right;
  if (startSide === 'bottom') return target.top - source.bottom;
  return source.top - target.bottom;
}

function findAlignedOffsets(source: FlowNodeBox, target: FlowNodeBox, startSide: FlowSide): [number, number] {
  const isHorizontal = isHorizontalSide(startSide);
  const overlapStart = isHorizontal ? Math.max(source.top, target.top) : Math.max(source.left, target.left);
  const overlapEnd = isHorizontal ? Math.min(source.bottom, target.bottom) : Math.min(source.right, target.right);
  if (overlapEnd - overlapStart < 2 * PORT_CORNER_MARGIN) return [0, 0];
  const middle = (overlapStart + overlapEnd) / 2;
  if (isHorizontal) return [middle - source.centerY, middle - target.centerY];
  return [middle - source.centerX, middle - target.centerX];
}

function findChannelStart(source: FlowNodeBox, startSide: FlowSide, gap: number): number {
  if (startSide === 'right') return source.right + gap / 2;
  if (startSide === 'left') return source.left - gap / 2;
  if (startSide === 'bottom') return source.bottom + gap / 2;
  return source.top - gap / 2;
}

function listFacingCandidates(source: FlowNodeBox, target: FlowNodeBox): FlowRouteCandidate[] {
  return FACING_SIDES.flatMap(([startSide, endSide]) => {
    const gap = measureGap(source, target, startSide);
    if (gap < 2 * MINIMUM_STUB) return [];
    const [startOffset, endOffset] = findAlignedOffsets(source, target, startSide);
    const channelMiddle = findChannelStart(source, startSide, gap);
    return CHANNEL_SHIFTS.filter((shift) => Math.abs(shift) <= gap / 2 - MINIMUM_STUB).map((shift) => ({
      startSide,
      endSide,
      shape: 'channel' as const,
      channel: channelMiddle + shift,
      startOffset,
      endOffset
    }));
  });
}

function leavesOutward(side: FlowSide, port: FlowPoint, next: FlowPoint): boolean {
  if (side === 'right') return next.x - port.x >= MINIMUM_STUB;
  if (side === 'left') return port.x - next.x >= MINIMUM_STUB;
  if (side === 'bottom') return next.y - port.y >= MINIMUM_STUB;
  return port.y - next.y >= MINIMUM_STUB;
}

function findElbowCorner(start: FlowPoint, end: FlowPoint, startSide: FlowSide): FlowPoint {
  return isHorizontalSide(startSide) ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
}

function listElbowCandidates(source: FlowNodeBox, target: FlowNodeBox): FlowRouteCandidate[] {
  return SIDES.flatMap((startSide) =>
    SIDES.filter((endSide) => isHorizontalSide(endSide) !== isHorizontalSide(startSide))
      .filter((endSide) => {
        const start = findPort(source, startSide, 0);
        const end = findPort(target, endSide, 0);
        const corner = findElbowCorner(start, end, startSide);
        return leavesOutward(startSide, start, corner) && leavesOutward(endSide, end, corner);
      })
      .map((endSide) => ({ startSide, endSide, shape: 'elbow' as const, channel: 0, startOffset: 0, endOffset: 0 }))
  );
}

function findLoopChannel(source: FlowNodeBox, target: FlowNodeBox, side: FlowSide, clearance: number): number {
  if (side === 'right') return Math.max(source.right, target.right) + clearance;
  if (side === 'left') return Math.min(source.left, target.left) - clearance;
  if (side === 'bottom') return Math.max(source.bottom, target.bottom) + clearance;
  return Math.min(source.top, target.top) - clearance;
}

function listLoopCandidates(source: FlowNodeBox, target: FlowNodeBox): FlowRouteCandidate[] {
  return SIDES.flatMap((side) =>
    LOOP_CLEARANCES.map((clearance) => ({
      startSide: side,
      endSide: side,
      shape: 'channel' as const,
      channel: findLoopChannel(source, target, side, clearance),
      startOffset: 0,
      endOffset: 0
    }))
  );
}

export function listRouteCandidates(source: FlowNodeBox, target: FlowNodeBox): FlowRouteCandidate[] {
  return [
    ...listFacingCandidates(source, target),
    ...listElbowCandidates(source, target),
    ...listLoopCandidates(source, target)
  ];
}

export function buildRoutePoints(
  candidate: FlowRouteCandidate,
  source: FlowNodeBox,
  target: FlowNodeBox,
  offsets: [number, number]
): FlowPoint[] {
  const start = findPort(source, candidate.startSide, offsets[0]);
  const end = findPort(target, candidate.endSide, offsets[1]);
  if (candidate.shape === 'elbow')
    return simplifyPoints([start, findElbowCorner(start, end, candidate.startSide), end]);
  if (isHorizontalSide(candidate.startSide))
    return simplifyPoints([start, { x: candidate.channel, y: start.y }, { x: candidate.channel, y: end.y }, end]);
  return simplifyPoints([start, { x: start.x, y: candidate.channel }, { x: end.x, y: candidate.channel }, end]);
}
