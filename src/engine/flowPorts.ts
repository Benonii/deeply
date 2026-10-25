import { isHorizontalSide } from './flowGeometry';

import type { FlowEdge, FlowNodeBox, FlowPortRequest } from '../types';
import type { FlowRouteCandidate, FlowSide } from '../types';

const PORT_SPACING = 16;
const MINIMUM_PORT_DISTANCE = 10;

function addPortRequest(groups: Map<string, FlowPortRequest[]>, groupKey: string, request: FlowPortRequest) {
  groups.set(groupKey, [...(groups.get(groupKey) ?? []), request]);
}

function groupPortRequests(
  edges: FlowEdge[],
  choices: Map<string, FlowRouteCandidate>,
  boxes: Map<string, FlowNodeBox>
): Map<string, FlowPortRequest[]> {
  const groups = new Map<string, FlowPortRequest[]>();
  edges.forEach((edge, order) => {
    const choice = choices.get(edge.id)!;
    addPortRequest(groups, `${edge.from}:${choice.startSide}`, {
      key: `${edge.id}:start`,
      side: choice.startSide,
      farBox: boxes.get(edge.to)!,
      baseOffset: choice.startOffset,
      order
    });
    addPortRequest(groups, `${edge.to}:${choice.endSide}`, {
      key: `${edge.id}:end`,
      side: choice.endSide,
      farBox: boxes.get(edge.from)!,
      baseOffset: choice.endOffset,
      order
    });
  });
  return groups;
}

function readSortPosition(request: FlowPortRequest): number {
  return isHorizontalSide(request.side) ? request.farBox.centerY : request.farBox.centerX;
}

function assignGroupOffsets(
  requests: FlowPortRequest[],
  box: FlowNodeBox,
  cornerMargin: number,
  offsets: Map<string, number>
) {
  if (requests.length === 1) {
    offsets.set(requests[0].key, requests[0].baseOffset);
    return;
  }
  const isHorizontal = isHorizontalSide(requests[0].side);
  const sideLength = isHorizontal ? box.bottom - box.top : box.right - box.left;
  const spacing = Math.min(PORT_SPACING, (sideLength - 2 * cornerMargin) / (requests.length - 1));
  const sorted = [...requests].sort(
    (first, second) => readSortPosition(first) - readSortPosition(second) || first.order - second.order
  );
  sorted.forEach((request, index) => {
    offsets.set(request.key, (index - (requests.length - 1) / 2) * spacing);
  });
}

const OPPOSITE_SIDES: Record<FlowSide, FlowSide> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

function readPortCoordinate(box: FlowNodeBox, side: FlowSide, offset: number): number {
  return (isHorizontalSide(side) ? box.centerY : box.centerX) + offset;
}

function fitsOnSide(box: FlowNodeBox, side: FlowSide, offset: number, cornerMargin: number): boolean {
  const halfLength = isHorizontalSide(side) ? (box.bottom - box.top) / 2 : (box.right - box.left) / 2;
  return Math.abs(offset) <= halfLength - cornerMargin;
}

function canMovePort(
  requests: FlowPortRequest[],
  key: string,
  offset: number,
  context: { offsets: Map<string, number>; cornerMargin: number }
): boolean {
  return requests
    .filter((request) => request.key !== key)
    .every((request) => Math.abs((context.offsets.get(request.key) ?? 0) - offset) >= MINIMUM_PORT_DISTANCE);
}

function alignFacingPorts(
  edge: FlowEdge,
  choice: FlowRouteCandidate,
  boxes: Map<string, FlowNodeBox>,
  groups: Map<string, FlowPortRequest[]>,
  context: { offsets: Map<string, number>; cornerMargin: number }
) {
  if (choice.shape !== 'channel' || OPPOSITE_SIDES[choice.startSide] !== choice.endSide) return;
  const source = boxes.get(edge.from)!;
  const target = boxes.get(edge.to)!;
  const startKey = `${edge.id}:start`;
  const endKey = `${edge.id}:end`;
  const startCoordinate = readPortCoordinate(source, choice.startSide, context.offsets.get(startKey) ?? 0);
  const endCoordinate = readPortCoordinate(target, choice.endSide, context.offsets.get(endKey) ?? 0);
  const alignedEndOffset = startCoordinate - readPortCoordinate(target, choice.endSide, 0);
  const alignedStartOffset = endCoordinate - readPortCoordinate(source, choice.startSide, 0);
  const targetRequests = groups.get(`${edge.to}:${choice.endSide}`) ?? [];
  const sourceRequests = groups.get(`${edge.from}:${choice.startSide}`) ?? [];
  if (
    fitsOnSide(target, choice.endSide, alignedEndOffset, context.cornerMargin) &&
    canMovePort(targetRequests, endKey, alignedEndOffset, context)
  )
    context.offsets.set(endKey, alignedEndOffset);
  else if (
    fitsOnSide(source, choice.startSide, alignedStartOffset, context.cornerMargin) &&
    canMovePort(sourceRequests, startKey, alignedStartOffset, context)
  )
    context.offsets.set(startKey, alignedStartOffset);
}

export function spreadPorts(
  edges: FlowEdge[],
  choices: Map<string, FlowRouteCandidate>,
  boxes: Map<string, FlowNodeBox>,
  cornerMargin: number
): Map<string, number> {
  const offsets = new Map<string, number>();
  const groups = groupPortRequests(edges, choices, boxes);
  for (const [groupKey, requests] of groups) {
    const nodeID = groupKey.slice(0, groupKey.lastIndexOf(':'));
    assignGroupOffsets(requests, boxes.get(nodeID)!, cornerMargin, offsets);
  }
  for (const edge of edges) alignFacingPorts(edge, choices.get(edge.id)!, boxes, groups, { offsets, cornerMargin });
  return offsets;
}
