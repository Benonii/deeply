import type { Infer } from 'convex/values';
import type { articleCheckInOutcome, conceptActivityDetail, conceptActivityInput } from './validators';
import type { conceptActivityRow, masteryCard, masteryRow } from './validators';

export type ModelProvider = 'openai' | 'anthropic';

export type ModelEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface TermReference {
  id: string;
  display: string;
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
