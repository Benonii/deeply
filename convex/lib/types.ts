import type { Infer } from 'convex/values';

import type { Id } from '../_generated/dataModel';
import type { courseRequestOrigin, courseRequestStage, courseRequestStatus } from './courseRequests';

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
