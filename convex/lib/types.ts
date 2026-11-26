import type { Infer } from 'convex/values';

import type { Id } from '../_generated/dataModel';
import type { courseCardFilter } from './courseCards';
import type { courseRequestOrigin, courseRequestStage, courseRequestStatus } from './courseRequests';
import type { articleCheckInOutcome, conceptActivityDetail, conceptActivityInput } from './validators';
import type { conceptActivityRow, masteryCard, masteryRow } from './validators';

export type ModelProvider = 'openai' | 'anthropic';

export type ModelEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface TermReference {
  id: string;
  display: string;
}

export interface Citation {
  sourceId: string;
}

export interface LessonLintOptions {
  termIdsTaughtEarlier?: Set<string>;
  codeRefIds?: Set<string>;
}

export type MasteryCard = Infer<typeof masteryCard>;

export interface Learner {
  deviceId: string;
  userId?: string;
}

export type MasteryRow = Infer<typeof masteryRow>;
export type ConceptActivityRow = Infer<typeof conceptActivityRow>;
export type ConceptActivityInput = Infer<typeof conceptActivityInput>;
export type ConceptActivityDetail = Infer<typeof conceptActivityDetail>;
export type ArticleCheckInOutcome = Infer<typeof articleCheckInOutcome>;

export interface CourseLearningState {
  concepts: MasteryRow[];
  activity: ConceptActivityRow[];
}

export interface HttpActionInternals {
  _handler: (context: unknown, request: Request) => Promise<Response>;
}

export type CourseRequestStage = Infer<typeof courseRequestStage>;

export type CourseRequestStatus = Infer<typeof courseRequestStatus>;

export type CourseRequestOrigin = Infer<typeof courseRequestOrigin>;

export interface CourseRequestView {
  id: Id<'courseRequests'>;
  topic: string;
  goal: string | null;
  status: CourseRequestStatus;
  stepsDone: CourseRequestStage[];
  origin: CourseRequestOrigin;
  courseId: Id<'courses'> | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export type CourseModuleStatus = 'pending' | 'writing' | 'ready' | 'failed';

export interface CourseModuleView {
  id: string;
  n: number;
  status: CourseModuleStatus;
  attempts: number;
  isUnverified: boolean;
}

export interface EngineCourseView {
  id: Id<'courses'>;
  slug: string;
  status: string;
  visibility: 'public' | 'unlisted';
  challengeCount: number;
}

export interface EngineStateView {
  request: CourseRequestView;
  sourceCount: number;
  map: unknown;
  course: EngineCourseView | null;
  modules: CourseModuleView[];
}

export interface ModuleOutlineRow {
  id: string;
  n: number;
  title: string;
  summary: string;
}

export type ModuleFate = 'pass' | 'retry' | 'publish-unverified';

export interface CheckRunView {
  moduleId: string;
  attempt: number;
  checkId: string;
  version: string;
  mode: 'on' | 'off' | 'shadow';
  pass: boolean;
  problemCount: number;
  fixNote: string;
}

export type BeginAttemptResult =
  | { status: 'begun'; attempt: number }
  | { status: 'unknownRequest' }
  | { status: 'noCourse' }
  | { status: 'unknownModule' }
  | { status: 'wrongStage'; stage: CourseRequestStatus };

export type FinishAttemptResult =
  | { status: 'stored'; modules: CourseModuleView[]; isEveryModuleReady: boolean }
  | { status: 'unknownRequest' }
  | { status: 'noCourse' }
  | { status: 'unknownModule' };

export type SaveResearchResult =
  | { status: 'saved' }
  | { status: 'unknownRequest' }
  | { status: 'wrongStage'; stage: CourseRequestStatus };

export type SaveMapResult =
  | { status: 'saved'; slug: string; courseId: Id<'courses'> }
  | { status: 'unknownRequest' }
  | { status: 'wrongStage'; stage: CourseRequestStatus };

export type SaveChallengesResult =
  | { status: 'saved'; challengeCount: number }
  | { status: 'unknownRequest' }
  | { status: 'noCourse' };

export type PublishCourseResult =
  | { status: 'published'; slug: string; moduleCount: number; unverifiedCount: number }
  | { status: 'unknownRequest' }
  | { status: 'noCourse' }
  | { status: 'modulesPending'; pending: CourseModuleView[] }
  | { status: 'alreadyPublished'; slug: string };

export interface AgentKeyView {
  id: Id<'agentKeys'>;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
}

export type AgentKeyAuthResult =
  | { status: 'authenticated'; userId: string }
  | { status: 'unknownKey' }
  | { status: 'revokedKey' }
  | { status: 'rateLimited'; retryAfterMs: number };

export type CreateAgentKeyResult =
  | { status: 'created'; secret: string; key: AgentKeyView }
  | { status: 'auth' }
  | { status: 'invalid'; message: string }
  | { status: 'rateLimited'; retryAfterMs: number };

export type CourseCardFilter = Infer<typeof courseCardFilter>;

export type CourseCardStatus =
  | { kind: 'building'; stage: CourseRequestStage; stepsDone: CourseRequestStage[] }
  | { kind: 'ready' }
  | { kind: 'failed'; reason: string | null };

export interface CourseRequestProgress {
  status: CourseRequestStatus;
  origin: CourseRequestOrigin;
  error?: string;
}

export interface CourseModuleProgress {
  total: number;
  ready: number;
  conceptCount: number;
}

export interface CourseCardView {
  key: string;
  title: string;
  tagline: string;
  status: CourseCardStatus;
  href: string | null;
  origin: CourseRequestOrigin | null;
  requestId: Id<'courseRequests'> | null;
  modules: CourseModuleProgress | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessageAllowance {
  isAllowed: boolean;
  retryAfterMs: number;
}

export type CreateCourseRequestOutcome =
  | { kind: 'created'; requestId: string; topic: string }
  | { kind: 'rejected'; problem: string };

export interface ShowCoursesOutcome {
  kind: 'listed';
  filter: CourseCardFilter;
  count: number;
}

export interface UrlProbe {
  status?: number;
  error?: string;
}

export interface WebFetchOptions {
  fetchResponse: typeof fetch;
  timeoutMs: number;
  method?: 'GET' | 'HEAD';
  accept?: string;
}
