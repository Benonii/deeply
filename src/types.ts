import type { convexBetterAuth } from '@farm.js/convex/better-auth';
import type { Block, Challenge } from '../convex/lib/courseSchema';
import type { ConceptActivityInput, ConceptActivityRow, MasteryRow } from '../convex/lib/types';

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

export interface MarkdownSegment {
  kind: 'prose' | 'code';
  text: string;
}

export type VideoBlockData = Extract<Block, { type: 'video' }>;
export type ArticleBlockData = Extract<Block, { type: 'article' }>;
export type ExplainBackBlockData = Extract<Block, { type: 'explainback' }>;

export interface LessonTerm {
  id: string;
  term: string;
  definition: string;
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
}

export interface CourseConcept {
  conceptId: string;
  name: string;
  moduleId: string;
}

export type ConceptStatus = 'untouched' | 'attempted' | 'passed';

export interface LessonActivity {
  conceptId: string;
  subjectId: string;
  detail: ConceptActivityInput;
}

export interface LessonState {
  courseId: string;
  basePath: string;
  moduleId: string;
  terms: Map<string, LessonTerm>;
  concepts: CourseConcept[];
  masteryByConcept: Map<string, MasteryRow>;
  activityBySubject: Map<string, ConceptActivityRow>;
  recordActivity: (activity: LessonActivity) => void;
}

export type ConvexBetterAuth = ReturnType<typeof convexBetterAuth>;

export interface DesktopSessionBody {
  oneTimeToken: string;
}

export interface DesktopSignInBody {
  pairingCode: string;
}
