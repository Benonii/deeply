import type { CheckID, CheckInput, CheckModule } from '../convex/checks/types';
import type { CheckSubmission } from '../convex/checks/submissionSchema';
import type { Source } from '../convex/lib/conceptMapSchema';
import type { GlossaryTerm, Section } from '../convex/lib/courseSchema';

export type Verdict = 'pass' | 'fail';

export type Outcome = Verdict | 'error';

export type CaseKind = 'clear' | 'borderline';

export interface CalibrationCase {
  id: string;
  expected: Verdict;
  kind: CaseKind;
  reason: string;
}

export interface JudgeReply {
  text: string;
  costUSD?: number;
}

export interface Judge {
  name: string;
  ask: (prompt: string, caseID: string) => Promise<JudgeReply>;
}

export interface PreparedCase {
  calibrationCase: CalibrationCase;
  input: CheckInput;
}

export interface EvalTarget {
  check: CheckModule;
  prepareCases: (raw: unknown) => PreparedCase[];
  describeMaterial: (input: CheckInput) => string[];
}

export interface CaseResult {
  id: string;
  kind: CaseKind;
  expected: Verdict;
  got: Outcome;
  reason: string;
  problems: string[];
  error?: string;
  reply: string;
  costUSD?: number;
}

export interface Confusion {
  failCaught: number;
  failMissed: number;
  passFlagged: number;
  passKept: number;
  failErrored: number;
  passErrored: number;
}

export interface Score {
  total: number;
  correct: number;
  errors: number;
  accuracy: number;
  failPrecision: number | null;
  failRecall: number | null;
  confusion: Confusion;
  accuracyByKind: Record<CaseKind, { total: number; correct: number }>;
}

export interface EvalReport {
  checkId: CheckID;
  checkVersion: string;
  judge: string;
  startedAt: string;
  score: Score;
  costUSD: number;
  disagreements: CaseResult[];
  results: CaseResult[];
}

export interface RunOptions {
  checkId: string;
  model?: string;
  limit?: number;
  concurrency: number;
}

export interface CasePackInput {
  topic: string;
  summary?: string;
  sections: Section[];
  glossary?: GlossaryTerm[];
}

export interface CaseMapInput {
  topic: string;
  goal?: string;
  sources?: Source[];
}

export type ParsedReply = { ok: true; submission: CheckSubmission } | { ok: false; error: string };

export interface RunEvalInput {
  target: EvalTarget;
  cases: PreparedCase[];
  judge: Judge;
  concurrency: number;
  onResult?: (result: CaseResult) => void;
}
