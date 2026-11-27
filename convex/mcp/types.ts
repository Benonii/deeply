import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { z, ZodType } from 'zod';

import type { ActionCtx } from '../_generated/server';

export interface AgentToolContext {
  actionContext: ActionCtx;
  userId: string;
}

export type AgentToolResult = { status: 'ok'; text: string } | { status: 'failed'; message: string };

export interface AgentToolDefinition<TInput extends ZodType> {
  name: string;
  title: string;
  description: string;
  inputSchema: TInput;
  run: (input: z.output<TInput>, context: AgentToolContext) => Promise<AgentToolResult>;
}

export interface AgentTool {
  name: string;
  registerOn: (server: McpServer, context: AgentToolContext) => void;
}
