import type { convexBetterAuth } from '@farm.js/convex/better-auth';
import type { Block, Challenge } from '../convex/lib/courseSchema';
import type { ConceptActivityDetail, ConceptActivityInput } from '../convex/lib/types';
import type { ConceptActivityRow, MasteryRow } from '../convex/lib/types';
import type { GradeResult } from '../convex/player/types';

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

export interface OwnedCourseSummary {
  slug: string;
  title: string;
  status: string;
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

export interface CourseSection {
  kind: 'm' | 'p';
  id: string;
}

export interface BuiltinCourseLink {
  id: string;
  title: string;
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

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'emphasis'; text: string }
  | { kind: 'citation'; text: string }
  | { kind: 'term'; text: string; termId: string }
  | { kind: 'link'; text: string; href: string };

export type CodeBlockData = Extract<Block, { type: 'code' }>;
export type RunnableLanguage = NonNullable<CodeBlockData['runnable']>;

export interface RunCodeBlockOptions {
  language: RunnableLanguage;
  code: string;
  onStarted: () => void;
}

export type CodeRunRequest = { kind: 'run'; runID: number; code: string };

export type CodeRunEvent =
  | { kind: 'started' }
  | { kind: 'printed'; runID: number; stdout: string; stderr: string }
  | { kind: 'raised'; runID: number; stdout: string; stderr: string; errorLine: string };

export type CodeRunState =
  | { kind: 'idle' }
  | { kind: 'booting'; startedAt: number }
  | { kind: 'running'; startedAt: number }
  | { kind: 'printed'; stdout: string; stderr: string; milliseconds: number }
  | { kind: 'raised'; stdout: string; stderr: string; errorLine: string; milliseconds: number };

export type CodeRunOutcome = Extract<CodeRunState, { kind: 'printed' | 'raised' }>;
export type ActiveCodeRunState = Exclude<CodeRunState, { kind: 'idle' }>;

export interface PyodideStreamOptions {
  batched: (text: string) => void;
}

export interface PyodideRuntime {
  setStdin: (options: { error: boolean }) => void;
  setStdout: (options: PyodideStreamOptions) => void;
  setStderr: (options: PyodideStreamOptions) => void;
  toPy: (value: unknown) => unknown;
  runPythonAsync: (code: string, options?: { globals?: unknown }) => Promise<unknown>;
}

export interface PyodideModule {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideRuntime>;
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

export interface ContinueInClaudeInput {
  courseTitle: string;
  moduleTitle: string;
  quote: string;
  question: string;
  answer: string;
}

export interface AskSelection {
  quote: string;
  sectionId: string;
  top: number;
  left: number;
}

export type ExplainBackGrade = Extract<ConceptActivityDetail, { kind: 'explainBack'; status: 'graded' }>;

export interface ExplainBackStatus {
  isMarking: boolean;
  isSaved: boolean;
  grade: ExplainBackGrade | null;
  metCount: number;
}

export type MarkPhase =
  | { kind: 'idle' }
  | { kind: 'marking' }
  | { kind: 'marked' }
  | { kind: 'rewriting' }
  | { kind: 'problem'; message: string };

export type ExplainAction = 'submit' | 'mark' | 'rewrite' | 'none';

export type AskRequest =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; askId: string }
  | { kind: 'refused'; message: string };

export interface LessonState {
  courseId: string;
  basePath: string;
  moduleId: string;
  terms: Map<string, LessonTerm>;
  concepts: CourseConcept[];
  masteryByConcept: Map<string, MasteryRow>;
  activityBySubject: Map<string, ConceptActivityRow>;
  recordActivity: (activity: LessonActivity) => void;
  submitExplainBack: (activity: LessonActivity) => Promise<GradeResult>;
}

export type ConvexBetterAuth = ReturnType<typeof convexBetterAuth>;

export interface DesktopSessionBody {
  oneTimeToken: string;
}

export interface DesktopSignInBody {
  pairingCode: string;
}

export interface AccountProfile {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  credits: number;
  isUnlimited: boolean;
  costs: Record<string, number>;
}

export interface CreditPack {
  key: 'small' | 'large';
  name: string;
  credits: number;
  priceCents: number | null;
  currency: string;
}

export interface CreditLedgerRow {
  id: string;
  at: number;
  delta: number;
  reason: string;
}
