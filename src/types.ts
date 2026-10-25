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
