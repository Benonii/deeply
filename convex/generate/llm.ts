import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { SYSTEM, repairPrompt } from './prompts';

export const MODEL = 'claude-opus-5-5';

export class GenerationError extends Error {}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('No JSON object in response');
  return JSON.parse(t.slice(start, end + 1));
}

/**
 * Ask Claude for JSON, validate it with zod (+ an optional extra lint), and
 * give it one chance to repair. Streams so long outputs don't time out.
 */
export async function generateJson<S extends z.ZodTypeAny>(opts: {
  prompt: string;
  schema: S;
  lint?: (value: z.infer<S>) => string[];
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}): Promise<{ value: z.infer<S>; usage: { input: number; output: number } }> {
  if (!process.env.ANTHROPIC_API_KEY) throw new GenerationError('ANTHROPIC_API_KEY is not set on this deployment.');
  const client = new Anthropic({ maxRetries: 3 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: opts.prompt }];
  const usage = { input: 0, output: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    const params = {
      model: MODEL,
      max_tokens: opts.maxTokens ?? 64000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: opts.effort ?? 'high' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages,
    };
    // `fallbacks: "default"` is newer than the SDK's request types.
    const stream = client.beta.messages.stream(params as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
    const msg = await stream.finalMessage();
    usage.input += msg.usage.input_tokens;
    usage.output += msg.usage.output_tokens;

    if (msg.stop_reason === 'refusal') {
      throw new GenerationError('The model declined to write this course. Try rephrasing the topic.');
    }
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    let errors: string[] = [];
    if (msg.stop_reason === 'max_tokens') errors = ['Output was cut off by the token limit; write it more compactly.'];
    else {
      try {
        const parsed = opts.schema.safeParse(extractJson(text));
        if (parsed.success) {
          errors = opts.lint ? opts.lint(parsed.data) : [];
          if (!errors.length) return { value: parsed.data, usage };
        } else {
          errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        }
      } catch (e) {
        errors = [`Invalid JSON: ${(e as Error).message}`];
      }
    }
    if (attempt === 1) throw new GenerationError(`Output failed validation: ${errors.slice(0, 5).join('; ')}`);
    // Append the full assistant turn (thinking blocks included) and ask for a fix.
    messages.push({ role: 'assistant', content: msg.content as Anthropic.Beta.BetaContentBlockParam[] });
    messages.push({ role: 'user', content: repairPrompt(errors) });
  }
  throw new GenerationError('unreachable');
}
