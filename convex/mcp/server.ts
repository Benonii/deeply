import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ZodType } from 'zod';
import type { AgentTool, AgentToolContext, AgentToolDefinition, AgentToolResult } from './types';

const SERVER_NAME = 'deeply';
const SERVER_VERSION = '1.0.0';

const SERVER_INSTRUCTIONS = [
  'Deeply turns a topic into a course the person can learn from in the browser.',
  'You do the research, the planning and the writing. Deeply validates every step with code, runs the checks and stores the result.',
  'The steps run in order: start_course, submit_research, submit_concept_map, then per module get_module_brief and submit_module, then publish_course.',
  'While writing a module, find_videos and score_videos pick its video, vet_articles and score_articles pick its reading.',
  'submit_challenges is optional and belongs before publish_course.',
  'Every tool answers with the next step. Read course_status for one request, or list_course_requests for the recent ones.',
  'Every request belongs to the owner of the key in the Authorization header.'
].join(' ');

function toCallToolResult(result: AgentToolResult): CallToolResult {
  if (result.status === 'failed') {
    return { content: [{ type: 'text', text: result.message }], isError: true };
  }
  return { content: [{ type: 'text', text: result.text }] };
}

export function defineAgentTool<TInput extends ZodType>(definition: AgentToolDefinition<TInput>): AgentTool {
  const advertisedSchema: ZodType = definition.inputSchema;
  return {
    name: definition.name,
    registerOn: (server, context) => {
      server.registerTool(
        definition.name,
        {
          title: definition.title,
          description: definition.description,
          inputSchema: advertisedSchema
        },
        async (input) => {
          const parsed = definition.inputSchema.safeParse(input);
          if (!parsed.success) {
            return toCallToolResult({ status: 'failed', message: z.prettifyError(parsed.error) });
          }
          return toCallToolResult(await definition.run(parsed.data, context));
        }
      );
    }
  };
}

export function buildAgentServer(tools: readonly AgentTool[], context: AgentToolContext): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: SERVER_INSTRUCTIONS });
  for (const tool of tools) tool.registerOn(server, context);
  return server;
}
