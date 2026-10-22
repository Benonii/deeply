import { type ModelMessage, streamText } from 'ai';
import type { z } from 'zod';
import { findMissingAPIKey, selectModel } from '../lib/model';
import { SYSTEM, repairPrompt } from './prompts';

import type { ModelEffort } from '../lib/types';

export class GenerationError extends Error {}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('No JSON object in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateJson<S extends z.ZodTypeAny>(options: {
  prompt: string;
  schema: S;
  lint?: (value: z.infer<S>) => string[];
  maxTokens?: number;
  effort?: ModelEffort;
}): Promise<{ value: z.infer<S>; usage: { input: number; output: number } }> {
  const missingKeyName = findMissingAPIKey();
  if (missingKeyName) throw new GenerationError(`${missingKeyName} is not set on this deployment.`);
  const { model, providerOptions } = selectModel(options.effort ?? 'high');
  const messages: ModelMessage[] = [{ role: 'user', content: options.prompt }];
  const usage = { input: 0, output: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = streamText({
      model,
      system: SYSTEM,
      messages,
      maxOutputTokens: options.maxTokens ?? 64000,
      maxRetries: 3,
      providerOptions
    });
    const [text, finishReason, totalUsage, response] = await Promise.all([
      result.text,
      result.finishReason,
      result.totalUsage,
      result.response
    ]);
    usage.input += totalUsage.inputTokens ?? 0;
    usage.output += totalUsage.outputTokens ?? 0;

    if (finishReason === 'content-filter') {
      throw new GenerationError('The model declined to write this course. Try rephrasing the topic.');
    }
    let errors: string[] = [];
    if (finishReason === 'length') errors = ['Output was cut off by the token limit; write it more compactly.'];
    else {
      try {
        const parsed = options.schema.safeParse(extractJson(text));
        if (parsed.success) {
          errors = options.lint ? options.lint(parsed.data) : [];
          if (!errors.length) return { value: parsed.data, usage };
        } else {
          errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
        }
      } catch (error) {
        errors = [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`];
      }
    }
    if (attempt === 1) throw new GenerationError(`Output failed validation: ${errors.slice(0, 5).join('; ')}`);
    messages.push(...response.messages);
    messages.push({ role: 'user', content: repairPrompt(errors) });
  }
  throw new GenerationError('unreachable');
}
