import { CheckSubmission } from '../convex/checks/submissionSchema';

import type { ParsedReply } from './types';

const FENCED_JSON = /```(?:json)?\s*([\s\S]*?)```/;

function extractJSONText(reply: string): string | null {
  const fenced = reply.match(FENCED_JSON)?.[1];
  const candidate = fenced ?? reply;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

function parseJSON(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      error: `the reply is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function parseReply(reply: string): ParsedReply {
  const text = extractJSONText(reply);
  if (text === null) return { ok: false, error: 'the reply holds no JSON object' };
  const json = parseJSON(text);
  if (!json.ok) return json;
  const parsed = CheckSubmission.safeParse(json.value);
  if (!parsed.success)
    return { ok: false, error: `the reply does not match the submission schema: ${parsed.error.message}` };
  return { ok: true, submission: parsed.data };
}
