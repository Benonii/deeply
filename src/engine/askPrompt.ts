import { stripMarks } from '../../convex/checks/moduleText';

import type { ContinueInClaudeInput } from '../types';

const CLAUDE_NEW_CHAT = 'https://claude.ai/new';
const MAXIMUM_QUOTE = 500;
const MAXIMUM_QUESTION = 300;
const MAXIMUM_ANSWER = 2500;
const MAXIMUM_PROMPT = 6000;

function clip(text: string, limit: number): string {
  const trimmed = text.trim();
  return trimmed.length <= limit ? trimmed : `${trimmed.slice(0, limit - 1)}…`;
}

export function buildContinueInClaudePrompt({
  courseTitle,
  moduleTitle,
  quote,
  question,
  answer
}: ContinueInClaudeInput): string {
  const prompt = [
    `I am working through a course called "${courseTitle}", in the module "${moduleTitle}".`,
    `The passage I selected:\n"${clip(stripMarks(quote), MAXIMUM_QUOTE)}"`,
    `What I asked:\n${clip(question, MAXIMUM_QUESTION)}`,
    `What the course answered:\n${clip(stripMarks(answer), MAXIMUM_ANSWER)}`,
    'Take it further: check that answer against what you know, fill in what it left out, and then quiz me on it.'
  ].join('\n\n');
  return clip(prompt, MAXIMUM_PROMPT);
}

export function buildContinueInClaudeURL(prompt: string): string {
  return `${CLAUDE_NEW_CHAT}?q=${encodeURIComponent(clip(prompt, MAXIMUM_PROMPT))}`;
}
