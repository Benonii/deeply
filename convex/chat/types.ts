import type { ActionCtx } from '../_generated/server';

export interface ChatToolContext {
  actionContext: ActionCtx;
  userId: string;
}
