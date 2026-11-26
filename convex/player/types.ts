import type { Infer } from 'convex/values';

import type { ConceptMap } from '../lib/conceptMapSchema';
import type { GlossaryTerm, ModulePack } from '../lib/courseSchema';
import type { askRow, askStatus } from './validators';

export type AskStatus = Infer<typeof askStatus>;
export type AskRow = Infer<typeof askRow>;

export interface AskView {
  id: string;
  quote: string;
  question: string;
  answer: string;
  status: AskStatus;
  conceptIds: string[];
  error: string | null;
  askedAt: number;
}

export interface AskPanelView {
  isSignedIn: boolean;
  remainingToday: number;
  dailyLimit: number;
  asks: AskView[];
}

export type AskResult =
  | { status: 'ok'; askId: string }
  | { status: 'auth' }
  | { status: 'rate'; retryAfterMs: number }
  | { status: 'unsupported' }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string };

export type SaveGradeResult = { status: 'saved' } | { status: 'notFound' } | { status: 'alreadyGraded' };

export type GradeResult =
  | { status: 'graded'; isPass: boolean }
  | { status: 'alreadyGraded' }
  | { status: 'auth' }
  | { status: 'rate'; retryAfterMs: number }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

export interface CourseSource {
  title: string;
  tagline: string;
  summary: string;
  map: ConceptMap | null;
  modules: ModulePack[];
}

export interface AskContextInput {
  source: CourseSource;
  moduleId: string;
  sectionId: string;
  quote: string;
  question: string;
}

export interface AskContextPart {
  name: string;
  characters: number;
  isTrimmed: boolean;
}

export interface AskContext {
  prompt: string;
  conceptIds: string[];
  termIds: string[];
  parts: AskContextPart[];
  characters: number;
}

export interface ResolvedExplainBack {
  moduleTitle: string;
  conceptId: string;
  prompt: string;
  rubric: string[];
  glossary: GlossaryTerm[];
}

export interface GradeSubject {
  block: ResolvedExplainBack;
  answer: string;
  isGraded: boolean;
}

export interface RubricPointResult {
  isMet: boolean;
  note: string;
}
