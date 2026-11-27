import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

import { ClaudePrintOutput } from './validators';

import type { Judge, JudgeReply } from './types';

const CLAUDE_TIMEOUT_MS = 300_000;

function buildClaudeArguments(model?: string): string[] {
  const modelArguments = model === undefined ? [] : ['--model', model];
  return ['-p', '--output-format', 'json', '--tools', '', '--no-session-persistence', ...modelArguments];
}

function readClaudeOutput(stdout: string): JudgeReply {
  const parsed = ClaudePrintOutput.parse(JSON.parse(stdout));
  if (parsed.is_error === true) throw new Error(`claude reported an error: ${parsed.result}`);
  return { text: parsed.result, costUSD: parsed.total_cost_usd };
}

function runClaude(prompt: string, model?: string): Promise<JudgeReply> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', buildClaudeArguments(model), { cwd: tmpdir(), timeout: CLAUDE_TIMEOUT_MS });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const detail = stderr.trim().length > 0 ? stderr.trim() : stdout.trim();
      if (code !== 0) return reject(new Error(`claude exited with ${code}: ${detail}`));
      try {
        resolve(readClaudeOutput(stdout));
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(prompt);
  });
}

export function createClaudeJudge(model?: string): Judge {
  return {
    name: `claude -p${model === undefined ? '' : ` --model ${model}`}`,
    ask: (prompt) => runClaude(prompt, model)
  };
}

export function createFakeJudge(replies: Record<string, string>): Judge {
  return {
    name: 'fake',
    ask: async (_prompt, caseID) => {
      const text = replies[caseID];
      if (text === undefined) throw new Error(`the fake judge has no reply for ${caseID}`);
      return { text };
    }
  };
}
