import { query } from '../_generated/server';
import { currentUser } from '../auth';
import { rateLimiter } from '../rateLimits';

import type { ChatMessageAllowance } from '../lib/types';

export const mine = query({
  args: {},
  handler: async (context): Promise<ChatMessageAllowance> => {
    const user = await currentUser(context);
    if (!user) return { isAllowed: false, retryAfterMs: 0 };
    const allowance = await rateLimiter.check(context, 'chatMessageDaily', { key: String(user._id) });
    return { isAllowed: allowance.ok, retryAfterMs: allowance.retryAfter ?? 0 };
  }
});
