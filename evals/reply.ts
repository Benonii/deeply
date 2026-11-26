import { CheckSubmission } from '../convex/checks/submissionSchema';

import type { ParsedReply } from './types';

function findObjectEnd(text: string, start: number): number {
  let depth = 0;
  let isInString = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (isInString) {
      if (character === '\\') index += 1;
      else if (character === '"') isInString = false;
      continue;
    }
    if (character === '"') isInString = true;
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function listTopLevelObjects(reply: string): string[] {
  const objects: string[] = [];
  let start = reply.indexOf('{');
  while (start !== -1) {
    const end = findObjectEnd(reply, start);
    if (end === -1) break;
    objects.push(reply.slice(start, end + 1));
    start = reply.indexOf('{', end + 1);
  }
  return objects;
}

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function parseReply(reply: string): ParsedReply {
  const values = listTopLevelObjects(reply)
    .map(parseJSON)
    .filter((value) => value !== undefined);
  if (values.length === 0) return { ok: false, error: 'the reply holds no valid JSON object' };
  const lastFirst = [...values].reverse();
  for (const value of lastFirst) {
    const parsed = CheckSubmission.safeParse(value);
    if (parsed.success) return { ok: true, submission: parsed.data };
  }
  const lastError = CheckSubmission.safeParse(lastFirst[0]).error?.message ?? 'unknown';
  return { ok: false, error: `no JSON object in the reply matches the submission schema: ${lastError}` };
}
