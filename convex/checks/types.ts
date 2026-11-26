import type { Challenge, GlossaryTerm, ModulePack } from '../lib/courseSchema';
import type { ConceptMap } from '../lib/conceptMapSchema';
import type { CheckSubmission } from './submissionSchema';

export type CheckID =
  | 'code-runs'
  | 'answer-keys'
  | 'facts-cited'
  | 'order'
  | 'jargon'
  | 'load'
  | 'quiz-quality'
  | 'links-and-videos'
  | 'teaching-quality';

export type CheckStage = 'code' | 'network' | 'agent';

export type CheckMode = 'on' | 'off' | 'shadow';

export interface CheckProblem {
  where: string;
  message: string;
}

export interface CheckOutcome {
  pass: boolean;
  problems: CheckProblem[];
  fixNote: string;
}

export interface CheckResult extends CheckOutcome {
  checkId: CheckID;
  version: string;
  mode: CheckMode;
}

export interface CheckInput {
  pack: ModulePack;
  map: ConceptMap;
  challenges?: Challenge[];
  termsTaughtEarlier?: GlossaryTerm[];
  submission?: CheckSubmission;
}

export interface CheckModule {
  checkId: CheckID;
  version: string;
  stage: CheckStage;
  prompt?: string;
  run: (input: CheckInput) => CheckOutcome | Promise<CheckOutcome>;
}

export interface CheckRegistration {
  check: CheckModule;
  mode: CheckMode;
}

export interface RunChecksOptions {
  registry?: CheckRegistration[];
  stages?: CheckStage[];
}

export interface ChecksRun {
  results: CheckResult[];
  skipped: CheckID[];
}

export type ModuleVerdict =
  | { kind: 'pass' }
  | { kind: 'retry'; nextAttempt: number; fixNotes: string[] }
  | { kind: 'publish-unverified'; fixNotes: string[] };

export interface TextField {
  where: string;
  text: string;
}

export interface RunnableCodeBlock {
  position: number;
  where: string;
  lang: string;
  code: string;
  expectedOutput?: string;
}

export interface QuizQuestion {
  position: number;
  where: string;
  question: string;
  options: string[];
  answer: number;
  conceptId?: string;
}

export interface LinkTarget {
  where: string;
  url: string;
}

export interface VideoTarget {
  position: number;
  where: string;
  youtubeId: string;
  startSec: number;
  endSec: number;
}
