import { MockLanguageModelV4, simulateReadableStream } from 'ai/test';

import type { LanguageModelV4Prompt, LanguageModelV4StreamPart, LanguageModelV4Usage } from '@ai-sdk/provider';
import type { CourseCardFilter } from '../lib/types';

export const isChatFake = () => process.env.CHAT_FAKE === '1';

const FAKE_MODEL_ID = 'deeply-chat-fake';

const CHUNK_MILLISECONDS = 24;

const NO_USAGE: LanguageModelV4Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, reasoning: 0, text: 0 }
};

const FINISH_AFTER_TEXT: LanguageModelV4StreamPart = {
  type: 'finish',
  usage: NO_USAGE,
  finishReason: { unified: 'stop', raw: 'stop' }
};

const FINISH_AFTER_TOOL_CALL: LanguageModelV4StreamPart = {
  type: 'finish',
  usage: NO_USAGE,
  finishReason: { unified: 'tool-calls', raw: 'tool_calls' }
};

const COURSE_PATTERN = /\b(?:make|build|create|write|start)\b[^.?!]*?\bcourse\b\s*(?:on|about|for|covering)\s+(.+)/i;

const FILTER_PATTERNS: [CourseCardFilter, RegExp][] = [
  ['building', /\b(building|in progress|being (?:built|written)|still)\b/i],
  ['ready', /\b(ready|finished|done|can open)\b/i],
  ['all', /\b(courses|catalog|library|builds)\b/i]
];

const FALLBACK_TEXT =
  'I can start a course on any topic, or show you the ones you already have. Try "make me a course on WebGPU".';

function readLastUserText(prompt: LanguageModelV4Prompt): string {
  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index];
    if (message?.role !== 'user') continue;
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ');
  }
  return '';
}

function readCourseTopic(text: string): string | null {
  const match = COURSE_PATTERN.exec(text);
  if (!match?.[1]) return null;
  const topic = match[1]
    .replace(/\s+/g, ' ')
    .replace(/[.?!,\s]+$/, '')
    .trim();
  return topic.length > 0 ? topic : null;
}

function readCoursesFilter(text: string): CourseCardFilter | null {
  if (!/\b(show|list|see|what|which|how)\b/i.test(text)) return null;
  for (const [filter, pattern] of FILTER_PATTERNS) {
    if (pattern.test(text)) return filter;
  }
  return null;
}

function textParts(text: string): LanguageModelV4StreamPart[] {
  const words = text.split(/(?<=\s)/);
  return [
    { type: 'text-start', id: 'fake-text' },
    ...words.map((delta): LanguageModelV4StreamPart => ({ type: 'text-delta', id: 'fake-text', delta })),
    { type: 'text-end', id: 'fake-text' },
    FINISH_AFTER_TEXT
  ];
}

function toolCallParts(toolName: string, input: object): LanguageModelV4StreamPart[] {
  return [
    {
      type: 'tool-call',
      toolCallId: `fake-${toolName}`,
      toolName,
      input: JSON.stringify(input)
    },
    FINISH_AFTER_TOOL_CALL
  ];
}

function planFakeReply(prompt: LanguageModelV4Prompt): LanguageModelV4StreamPart[] {
  const text = readLastUserText(prompt);
  const topic = readCourseTopic(text);
  if (topic) return toolCallParts('create_course_request', { topic });
  const filter = readCoursesFilter(text);
  if (filter) return toolCallParts('show_courses', { filter });
  return textParts(FALLBACK_TEXT);
}

export function fakeChatModel() {
  return new MockLanguageModelV4({
    provider: 'deeply-fake',
    modelId: FAKE_MODEL_ID,
    doStream: async ({ prompt }) => ({
      stream: simulateReadableStream({
        chunks: [{ type: 'stream-start', warnings: [] }, ...planFakeReply(prompt)],
        chunkDelayInMs: CHUNK_MILLISECONDS
      })
    })
  });
}
