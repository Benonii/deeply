import { MockLanguageModelV4, simulateReadableStream } from 'ai/test';

import { collapseSpaces, shorten } from '../checks/moduleText';

import type { LanguageModelV4Prompt, LanguageModelV4StreamPart, LanguageModelV4Usage } from '@ai-sdk/provider';

export const isPlayerFake = () => process.env.PLAYER_FAKE === '1';

const FAKE_PROVIDER = 'deeply-fake';
const CHUNK_MILLISECONDS = 18;
const MINIMUM_KEYWORD_LENGTH = 5;
const QUOTE_CHARACTERS = 160;

const NO_USAGE: LanguageModelV4Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, reasoning: 0, text: 0 }
};

const FINISH: LanguageModelV4StreamPart = {
  type: 'finish',
  usage: NO_USAGE,
  finishReason: { unified: 'stop', raw: 'stop' }
};

function readPromptText(prompt: LanguageModelV4Prompt): string {
  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index];
    if (message?.role !== 'user') continue;
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
  }
  return '';
}

function readTag(text: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>\\n?([\\s\\S]*?)</${tag}>`).exec(text);
  return match ? match[1].trim() : '';
}

function readFirstGlossaryTerm(text: string) {
  const match = /^- \[\[([a-z0-9-]+)\]\] [^—]+ — (.+)$/m.exec(readTag(text, 'glossary'));
  return match ? { id: match[1], definition: match[2].trim() } : null;
}

function buildFakeAnswer(prompt: LanguageModelV4Prompt): string {
  const text = readPromptText(prompt);
  const question = collapseSpaces(readTag(text, 'question'));
  const passage = shorten(readTag(text, 'selected-passage'), QUOTE_CHARACTERS);
  const term = readFirstGlossaryTerm(text);
  const lines = [
    term
      ? `This part of the course turns on [[${term.id}]]: ${term.definition}`
      : 'The course does not cover that directly.',
    passage.length > 0 ? `You selected: "${passage}"` : '',
    question.length > 0 ? `You asked: ${question}` : '',
    'This answer came from the offline fixture model, so no course reasoning happened.'
  ];
  return lines.filter((line) => line.length > 0).join('\n\n');
}

const STOP_WORDS = new Set(['names', 'their', 'there', 'about', 'which', 'these', 'those', 'where', 'rather']);

function listKeywords(point: string): string[] {
  return [...new Set(point.toLowerCase().match(/[a-z()_]{5,}/g) ?? [])]
    .map((word) => word.replace(/[()_]/g, ''))
    .filter((word) => word.length >= MINIMUM_KEYWORD_LENGTH && !STOP_WORDS.has(word));
}

function buildFakeGrade(prompt: LanguageModelV4Prompt): string {
  const text = readPromptText(prompt);
  const answer = readTag(text, 'learner-answer').toLowerCase();
  const points = readTag(text, 'rubric')
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0)
    .map((point) => {
      const hits = listKeywords(point).filter((keyword) => answer.includes(keyword));
      return {
        isMet: hits.length > 0,
        note:
          hits.length > 0
            ? `You covered this: ${hits.slice(0, 3).join(', ')}.`
            : 'Your answer does not make this point.'
      };
    });
  return JSON.stringify({ points });
}

function listTextParts(text: string): LanguageModelV4StreamPart[] {
  const words = text.split(/(?<=\s)/);
  return [
    { type: 'stream-start', warnings: [] },
    { type: 'text-start', id: 'fake-text' },
    ...words.map((delta): LanguageModelV4StreamPart => ({ type: 'text-delta', id: 'fake-text', delta })),
    { type: 'text-end', id: 'fake-text' },
    FINISH
  ];
}

function fakeModel(modelID: string, reply: (prompt: LanguageModelV4Prompt) => string) {
  return new MockLanguageModelV4({
    provider: FAKE_PROVIDER,
    modelId: modelID,
    doStream: async ({ prompt }) => ({
      stream: simulateReadableStream({ chunks: listTextParts(reply(prompt)), chunkDelayInMs: CHUNK_MILLISECONDS })
    })
  });
}

export const fakeAskModel = () => fakeModel('deeply-ask-fake', buildFakeAnswer);

export const fakeGradeModel = () => fakeModel('deeply-grade-fake', buildFakeGrade);
