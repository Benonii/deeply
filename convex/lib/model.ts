import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

import type { ModelEffort, ModelProvider } from './types';

const DEFAULT_MODEL_IDS: Record<ModelProvider, string> = {
  openai: 'gpt-6-luna',
  anthropic: 'claude-opus-5-5'
};

const API_KEY_NAMES: Record<ModelProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY'
};

function readProvider(): ModelProvider {
  return process.env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'openai';
}

export function findMissingAPIKey(): string | null {
  const keyName = API_KEY_NAMES[readProvider()];
  return process.env[keyName] ? null : keyName;
}

export function selectModel(effort: ModelEffort) {
  const provider = readProvider();
  const modelID = process.env.AI_MODEL ?? DEFAULT_MODEL_IDS[provider];
  return {
    model: provider === 'anthropic' ? anthropic(modelID) : openai(modelID),
    providerOptions: {
      anthropic: { effort, fallbacks: 'default' },
      openai: { reasoningEffort: effort }
    }
  };
}
