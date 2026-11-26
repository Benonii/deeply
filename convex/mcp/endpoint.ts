import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { internal } from '../_generated/api';
import { httpAction } from '../_generated/server';
import { hashAgentKeySecret, readBearerSecret } from '../lib/agentKeys';
import { buildAgentServer } from './server';
import { AGENT_TOOLS } from './tools';

import type { AgentKeyAuthResult } from '../lib/types';

const SERVER_ERROR_CODE = -32000;
const UNAUTHORIZED_CODE = -32001;
const RATE_LIMITED_CODE = -32002;

const MISSING_KEY_MESSAGE =
  'No API key. Send Authorization: Bearer <key> with a key made on the Account page of the web app.';

const MALFORMED_KEY_MESSAGE =
  'That API key is not valid. Copy the whole key from the Account page of the web app, or make a new one there.';

const REJECTED_KEY_MESSAGES: Record<Exclude<AgentKeyAuthResult['status'], 'authenticated' | 'rateLimited'>, string> = {
  unknownKey: 'That API key does not exist. Make a new one on the Account page of the web app.',
  revokedKey: 'That API key was revoked. Make a new one on the Account page of the web app.'
};

function jsonRpcErrorResponse(status: number, code: number, message: string, headers: HeadersInit): Response {
  return Response.json({ jsonrpc: '2.0', id: null, error: { code, message } }, { status, headers });
}

function unauthorizedResponse(message: string): Response {
  return jsonRpcErrorResponse(401, UNAUTHORIZED_CODE, message, { 'www-authenticate': 'Bearer' });
}

export const handleAgentRequest = httpAction(async (actionContext, request) => {
  const bearer = readBearerSecret(request.headers.get('authorization'));
  if (bearer.kind === 'missing') return unauthorizedResponse(MISSING_KEY_MESSAGE);
  if (bearer.kind === 'malformed') return unauthorizedResponse(MALFORMED_KEY_MESSAGE);

  const authResult = await actionContext.runMutation(internal.agentKeys.authenticate, {
    secretHash: await hashAgentKeySecret(bearer.secret)
  });
  if (authResult.status === 'rateLimited') {
    const retryAfterSeconds = Math.max(1, Math.ceil(authResult.retryAfterMs / 1000));
    const unit = retryAfterSeconds === 1 ? 'second' : 'seconds';
    return jsonRpcErrorResponse(
      429,
      RATE_LIMITED_CODE,
      `Too many calls on this key. Try again in ${retryAfterSeconds} ${unit}.`,
      { 'retry-after': String(retryAfterSeconds) }
    );
  }
  if (authResult.status !== 'authenticated') return unauthorizedResponse(REJECTED_KEY_MESSAGES[authResult.status]);

  const server = buildAgentServer(AGENT_TOOLS, { actionContext, userId: authResult.userId });
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return await transport.handleRequest(request);
});

export const rejectAgentStream = httpAction(async () =>
  jsonRpcErrorResponse(405, SERVER_ERROR_CODE, 'This endpoint only takes POST.', { allow: 'POST' })
);
