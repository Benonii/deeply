import { convertToModelMessages, streamText, validateUIMessages } from 'ai';

import { httpAction } from '../_generated/server';
import { currentUser } from '../auth';
import { CHAT_SIGNED_OUT_MESSAGE, CHAT_UNAVAILABLE_MESSAGE, readMessageCapMessage } from '../lib/chat';
import { selectModel } from '../lib/model';
import { rateLimiter } from '../rateLimits';
import { fakeChatModel, isChatFake } from './fake';
import { CHAT_SYSTEM_PROMPT } from './prompt';
import { buildChatTools } from './tools';
import { chatRequestBody } from './validators';

import type { ActionCtx } from '../_generated/server';

const MAX_OUTPUT_TOKENS = 700;

const BAD_REQUEST_MESSAGE = 'That message could not be read. Reload the page and try again.';

function textResponse(status: number, message: string): Response {
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

function selectChatModel() {
  if (isChatFake()) return { model: fakeChatModel(), providerOptions: undefined };
  return selectModel('low');
}

async function readUserId(actionContext: ActionCtx): Promise<string | null> {
  try {
    const user = await currentUser(actionContext);
    return user ? String(user._id) : null;
  } catch {
    return null;
  }
}

export const handleChatRequest = httpAction(async (actionContext, request) => {
  const userId = await readUserId(actionContext);
  if (!userId) return textResponse(401, CHAT_SIGNED_OUT_MESSAGE);

  const body = chatRequestBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return textResponse(400, BAD_REQUEST_MESSAGE);

  const mine = await rateLimiter.limit(actionContext, 'chatMessageDaily', { key: userId });
  if (!mine.ok) return textResponse(429, readMessageCapMessage(mine.retryAfter));
  const everyone = await rateLimiter.limit(actionContext, 'chatMessageGlobal');
  if (!everyone.ok) return textResponse(429, CHAT_UNAVAILABLE_MESSAGE);

  const messages = await validateUIMessages({ messages: body.data.messages }).catch(() => null);
  if (!messages) return textResponse(400, BAD_REQUEST_MESSAGE);

  const { model, providerOptions } = selectChatModel();
  const result = streamText({
    model,
    providerOptions,
    system: CHAT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: buildChatTools({ actionContext, userId }),
    maxOutputTokens: MAX_OUTPUT_TOKENS
  });
  return result.toUIMessageStreamResponse({ onError: () => CHAT_UNAVAILABLE_MESSAGE });
});
