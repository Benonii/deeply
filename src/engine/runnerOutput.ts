const OUTPUT_CHARACTER_LIMIT = 20000;
const TRUNCATION_NOTE = `\n[output cut off after ${OUTPUT_CHARACTER_LIMIT} characters]`;

export function appendRunnerOutput(collected: string, addition: string): string {
  if (collected.endsWith(TRUNCATION_NOTE)) return collected;
  const joined = collected + addition;
  if (joined.length <= OUTPUT_CHARACTER_LIMIT) return joined;
  return joined.slice(0, OUTPUT_CHARACTER_LIMIT) + TRUNCATION_NOTE;
}

export function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const INTERNAL_FRAME = /^\s*File ".*[\\/]_pyodide[\\/]/;
const FRAME_START = /^\s*File "/;

export function trimPyodideFrames(traceback: string): string {
  const kept: string[] = [];
  let isSkipping = false;
  for (const line of traceback.split('\n')) {
    if (INTERNAL_FRAME.test(line)) {
      isSkipping = true;
      continue;
    }
    if (isSkipping && line.startsWith(' ') && !FRAME_START.test(line)) continue;
    isSkipping = false;
    kept.push(line);
  }
  return kept.join('\n');
}

export function readLastLine(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  return lines.length === 0 ? '' : lines[lines.length - 1].trim();
}
