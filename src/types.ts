import type { Challenge } from '../convex/lib/courseSchema';

export interface GeneratedCourseMeta {
  title?: string;
  tagline?: string;
  summary?: string;
  brand?: unknown;
  challenges?: Challenge[];
  codeRefs?: Record<string, unknown>;
}

export interface GeneratedModuleDetails {
  id?: string;
  title?: string;
  kicker?: string;
  minutes?: number;
  summary?: string;
}

export interface PublicCourseListing {
  slug: string;
  title: string;
  tagline: string;
  kind: 'concept' | 'repo';
  brand: unknown;
  status: string;
  moduleCount: number;
  readyModules: number;
  createdAt: number;
}

export interface UntrustedBrand {
  name?: unknown;
  colors?: Record<string, unknown>;
  fonts?: Record<string, unknown>;
  shader?: { kind?: unknown; colors?: unknown };
  source?: unknown;
}

export interface WireTappedWebSocket {
  isTapped?: boolean;
}

export type TraceStepState = 'done' | 'active' | 'todo' | 'failed';

export interface TraceStep {
  label: string;
  state: TraceStepState;
}

export type CourseSource = 'c' | 'g';

export interface CourseSection {
  kind: 'm' | 'p';
  id: string;
}

export interface CourseRouteParams {
  course: string;
  module?: string;
  page?: string;
}

export interface FlowNode {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  tone?: 'yellow' | 'red' | 'purple' | 'plain';
  code?: string[];
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  code?: string[];
}

export interface FlowStep {
  title: string;
  text: string;
  nodes?: string[];
  edges?: string[];
}

export type FlowSide = 'left' | 'right' | 'top' | 'bottom';

export type FlowLabelAnchor = 'start' | 'middle' | 'end';

export interface FlowPoint {
  x: number;
  y: number;
}

export interface FlowSegment {
  start: FlowPoint;
  end: FlowPoint;
}

export interface FlowBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FlowNodeBox extends FlowBox {
  centerX: number;
  centerY: number;
}

export interface FlowBounds {
  width: number;
  height: number;
}

export interface FlowRouteCandidate {
  startSide: FlowSide;
  endSide: FlowSide;
  shape: 'elbow' | 'channel';
  channel: number;
  startOffset: number;
  endOffset: number;
}

export interface FlowPortRequest {
  key: string;
  side: FlowSide;
  farBox: FlowNodeBox;
  baseOffset: number;
  order: number;
}

export interface FlowLabelPlacement {
  x: number;
  y: number;
  anchor: FlowLabelAnchor;
  lines: string[];
}

export interface FlowLabelCandidate {
  placement: FlowLabelPlacement;
  box: FlowBox;
  baseCost: number;
}

export interface RoutedFlowEdge {
  edge: FlowEdge;
  path: string;
  label: FlowLabelPlacement | null;
}
