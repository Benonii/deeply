import { v } from 'convex/values';

import { internalMutation, mutation, query } from './_generated/server';
import { currentUser } from './auth';
import {
  AGENT_KEY_NAME_MAX_LENGTH,
  createAgentKeySecret,
  hashAgentKeySecret,
  readAgentKeyPrefix
} from './lib/agentKeys';
import { rateLimiter } from './rateLimits';

import type { Doc } from './_generated/dataModel';
import type { AgentKeyAuthResult, AgentKeyView, CreateAgentKeyResult } from './lib/types';

const LIST_LIMIT = 50;

function toView(key: Doc<'agentKeys'>): AgentKeyView {
  return {
    id: key._id,
    name: key.name,
    prefix: key.prefix,
    createdAt: key._creationTime,
    lastUsedAt: key.lastUsedAt ?? null
  };
}

export const list = query({
  args: {},
  handler: async (context): Promise<{ mcpURL: string; keys: AgentKeyView[] }> => {
    const mcpURL = `${process.env.CONVEX_SITE_URL ?? ''}/mcp`;
    const user = await currentUser(context);
    if (!user) return { mcpURL, keys: [] };
    const rows = await context.db
      .query('agentKeys')
      .withIndex('by_user', (indexRange) => indexRange.eq('userId', String(user._id)))
      .order('desc')
      .take(LIST_LIMIT);
    return { mcpURL, keys: rows.filter((key) => !key.revokedAt).map(toView) };
  }
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (context, { name }): Promise<CreateAgentKeyResult> => {
    const user = await currentUser(context);
    if (!user) return { status: 'auth' };
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    if (!trimmedName) return { status: 'invalid', message: 'Give the key a name so you can tell it apart later.' };
    if (trimmedName.length > AGENT_KEY_NAME_MAX_LENGTH) {
      return { status: 'invalid', message: `The name must be ${AGENT_KEY_NAME_MAX_LENGTH} characters or fewer.` };
    }
    const allowance = await rateLimiter.limit(context, 'agentKeyCreate', { key: String(user._id) });
    if (!allowance.ok) return { status: 'rateLimited', retryAfterMs: allowance.retryAfter ?? 3_600_000 };

    const secret = createAgentKeySecret();
    const id = await context.db.insert('agentKeys', {
      userId: String(user._id),
      name: trimmedName,
      prefix: readAgentKeyPrefix(secret),
      secretHash: await hashAgentKeySecret(secret)
    });
    return {
      status: 'created',
      secret,
      key: { id, name: trimmedName, prefix: readAgentKeyPrefix(secret), createdAt: Date.now(), lastUsedAt: null }
    };
  }
});

export const revoke = mutation({
  args: { keyId: v.id('agentKeys') },
  handler: async (context, { keyId }): Promise<{ status: 'revoked' | 'auth' | 'unknown' }> => {
    const user = await currentUser(context);
    if (!user) return { status: 'auth' };
    const key = await context.db.get(keyId);
    if (!key || key.userId !== String(user._id)) return { status: 'unknown' };
    if (!key.revokedAt) await context.db.patch(keyId, { revokedAt: Date.now() });
    return { status: 'revoked' };
  }
});

export const authenticate = internalMutation({
  args: { secretHash: v.string() },
  handler: async (context, { secretHash }): Promise<AgentKeyAuthResult> => {
    const key = await context.db
      .query('agentKeys')
      .withIndex('by_hash', (indexRange) => indexRange.eq('secretHash', secretHash))
      .unique();
    if (!key) return { status: 'unknownKey' };
    if (key.revokedAt) return { status: 'revokedKey' };

    const perKey = await rateLimiter.limit(context, 'agentCall', { key: key._id });
    if (!perKey.ok) return { status: 'rateLimited', retryAfterMs: perKey.retryAfter ?? 60_000 };
    const everyone = await rateLimiter.limit(context, 'agentCallGlobal');
    if (!everyone.ok) return { status: 'rateLimited', retryAfterMs: everyone.retryAfter ?? 60_000 };

    await context.db.patch(key._id, { lastUsedAt: Date.now() });
    return { status: 'authenticated', userId: key.userId };
  }
});
