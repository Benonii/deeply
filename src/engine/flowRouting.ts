import { buildRoundedPath, inflateBox, isHorizontalSegment, listSegments } from './flowGeometry';
import { measureNode, measureSegment, pickCheapest } from './flowGeometry';
import { pullBackEnd, segmentCrossesBox } from './flowGeometry';
import { placeLabels } from './flowLabels';
import { PORT_CORNER_MARGIN, buildRoutePoints, listRouteCandidates, MINIMUM_STUB } from './flowRouteCandidates';
import { spreadPorts } from './flowPorts';

import type { FlowBounds, FlowEdge, FlowNode, FlowNodeBox } from '../types';
import type { FlowPoint, FlowRouteCandidate, FlowSegment } from '../types';
import type { RoutedFlowEdge } from '../types';

const OBSTACLE_PADDING = 8;
const BEND_COST = 36;
const BLOCKED_COST = 5000;
const SHORT_STUB_COST = 2000;
const SHARED_LINE_COST = 400;
const CROSSING_COST = 60;
const SHARED_LINE_DISTANCE = 8;
const ARROW_GAP = 2;
const STRAIGHT_PRIORITY_BONUS = 100000;

function readRange(segment: FlowSegment, isHorizontal: boolean): [number, number] {
  const values = isHorizontal ? [segment.start.x, segment.end.x] : [segment.start.y, segment.end.y];
  return [Math.min(...values), Math.max(...values)];
}

function segmentsShareLine(first: FlowSegment, second: FlowSegment): boolean {
  const isHorizontal = isHorizontalSegment(first);
  if (isHorizontal !== isHorizontalSegment(second)) return false;
  const lineDistance = isHorizontal
    ? Math.abs(first.start.y - second.start.y)
    : Math.abs(first.start.x - second.start.x);
  if (lineDistance >= SHARED_LINE_DISTANCE) return false;
  const [firstStart, firstEnd] = readRange(first, isHorizontal);
  const [secondStart, secondEnd] = readRange(second, isHorizontal);
  return Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart) > 2;
}

function segmentsCross(first: FlowSegment, second: FlowSegment): boolean {
  if (isHorizontalSegment(first) === isHorizontalSegment(second)) return false;
  const [horizontal, vertical] = isHorizontalSegment(first) ? [first, second] : [second, first];
  const [horizontalStart, horizontalEnd] = readRange(horizontal, true);
  const [verticalStart, verticalEnd] = readRange(vertical, false);
  const crossingX = vertical.start.x;
  const crossingY = horizontal.start.y;
  return (
    horizontalStart < crossingX && crossingX < horizontalEnd && verticalStart < crossingY && crossingY < verticalEnd
  );
}

function isOutOfBounds(point: FlowPoint, bounds: FlowBounds): boolean {
  return point.x < 4 || point.y < 4 || point.x > bounds.width - 4 || point.y > bounds.height - 4;
}

function scoreRoute(points: FlowPoint[], obstacles: FlowNodeBox[], routedSegments: FlowSegment[], bounds: FlowBounds) {
  const segments = listSegments(points);
  const stubs = [segments[0], segments[segments.length - 1]];
  const blockedCount = segments.filter((segment) => obstacles.some((box) => segmentCrossesBox(segment, box))).length;
  const sharedCount = segments.filter((segment) =>
    routedSegments.some((routed) => segmentsShareLine(segment, routed))
  ).length;
  const crossingCount = segments.filter((segment) =>
    routedSegments.some((routed) => segmentsCross(segment, routed))
  ).length;
  return (
    segments.reduce((total, segment) => total + measureSegment(segment), 0) +
    (points.length - 2) * BEND_COST +
    blockedCount * BLOCKED_COST +
    stubs.filter((stub) => measureSegment(stub) < MINIMUM_STUB).length * SHORT_STUB_COST +
    points.filter((point) => isOutOfBounds(point, bounds)).length * BLOCKED_COST +
    sharedCount * SHARED_LINE_COST +
    crossingCount * CROSSING_COST
  );
}

function hasStraightRoute(edge: FlowEdge, boxes: Map<string, FlowNodeBox>): boolean {
  const source = boxes.get(edge.from)!;
  const target = boxes.get(edge.to)!;
  return listRouteCandidates(source, target).some(
    (candidate) =>
      buildRoutePoints(candidate, source, target, [candidate.startOffset, candidate.endOffset]).length === 2
  );
}

function sortByRoutingPriority(edges: FlowEdge[], boxes: Map<string, FlowNodeBox>): FlowEdge[] {
  const measurePriority = (edge: FlowEdge) => {
    const source = boxes.get(edge.from)!;
    const target = boxes.get(edge.to)!;
    const distance = Math.abs(source.centerX - target.centerX) + Math.abs(source.centerY - target.centerY);
    return hasStraightRoute(edge, boxes) ? distance : distance + STRAIGHT_PRIORITY_BONUS;
  };
  return [...edges].sort((first, second) => measurePriority(first) - measurePriority(second));
}

function listObstacles(edge: FlowEdge, boxes: Map<string, FlowNodeBox>): FlowNodeBox[] {
  return [...boxes.entries()].map(([nodeID, box]) =>
    nodeID === edge.from || nodeID === edge.to ? box : inflateBox(box, OBSTACLE_PADDING)
  );
}

function chooseRoutes(edges: FlowEdge[], boxes: Map<string, FlowNodeBox>, bounds: FlowBounds) {
  const routedSegments: FlowSegment[] = [];
  const choices = new Map<string, FlowRouteCandidate>();
  for (const edge of sortByRoutingPriority(edges, boxes)) {
    const source = boxes.get(edge.from)!;
    const target = boxes.get(edge.to)!;
    const obstacles = listObstacles(edge, boxes);
    const buildPoints = (candidate: FlowRouteCandidate) =>
      buildRoutePoints(candidate, source, target, [candidate.startOffset, candidate.endOffset]);
    const best = pickCheapest(listRouteCandidates(source, target), (candidate) =>
      scoreRoute(buildPoints(candidate), obstacles, routedSegments, bounds)
    );
    choices.set(edge.id, best);
    routedSegments.push(...listSegments(buildPoints(best)));
  }
  return choices;
}

export function routeFlowEdges(nodes: FlowNode[], edges: FlowEdge[], bounds: FlowBounds): RoutedFlowEdge[] {
  const boxes = new Map(nodes.map((node) => [node.id, measureNode(node)]));
  const choices = chooseRoutes(edges, boxes, bounds);
  const offsets = spreadPorts(edges, choices, boxes, PORT_CORNER_MARGIN);
  const routes = edges.map((edge) =>
    buildRoutePoints(choices.get(edge.id)!, boxes.get(edge.from)!, boxes.get(edge.to)!, [
      offsets.get(`${edge.id}:start`) ?? 0,
      offsets.get(`${edge.id}:end`) ?? 0
    ])
  );
  const labels = placeLabels(edges, routes, [...boxes.values()], bounds);
  return edges.map((edge, index) => ({
    edge,
    path: buildRoundedPath(pullBackEnd(routes[index], ARROW_GAP)),
    label: labels[index]
  }));
}
