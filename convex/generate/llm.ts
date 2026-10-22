import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { SYSTEM, repairPrompt } from './prompts';

export const MODEL = 'claude-opus-5-5';

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
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}): Promise<{ value: z.infer<S>; usage: { input: number; output: number } }> {
  if (!process.env.ANTHROPIC_API_KEY) throw new GenerationError('ANTHROPIC_API_KEY is not set on this deployment.');
  const client = new Anthropic({ maxRetries: 3 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: options.prompt }];
  const usage = { input: 0, output: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    const params = {
      model: MODEL,
      max_tokens: options.maxTokens ?? 64000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: options.effort ?? 'high' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages
    };
    const stream = client.beta.messages.stream(
      params as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming
    );
    const message = await stream.finalMessage();
    usage.input += message.usage.input_tokens;
    usage.output += message.usage.output_tokens;

    if (message.stop_reason === 'refusal') {
      throw new GenerationError('The model declined to write this course. Try rephrasing the topic.');
    }
    const text = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
    let errors: string[] = [];
    if (message.stop_reason === 'max_tokens')
      errors = ['Output was cut off by the token limit; write it more compactly.'];
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
        errors = [`Invalid JSON: ${(error as Error).message}`];
      }
    }
    if (attempt === 1) throw new GenerationError(`Output failed validation: ${errors.slice(0, 5).join('; ')}`);
    messages.push({ role: 'assistant', content: message.content as Anthropic.Beta.BetaContentBlockParam[] });
    messages.push({ role: 'user', content: repairPrompt(errors) });
  }
  throw new GenerationError('unreachable');
}
