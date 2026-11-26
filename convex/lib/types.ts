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
