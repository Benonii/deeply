export type ModelProvider = 'openai' | 'anthropic';

export type ModelEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface HttpActionInternals {
  _handler: (context: unknown, request: Request) => Promise<Response>;
}
