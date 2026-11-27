import { z } from 'zod';

import { describeFailure, fetchWithTimeout } from '../lib/webFetch';
import { YOUTUBE_API_BASE } from '../lib/youtube';
import { finderThresholds, quotaUnitsPerCall } from './weights';
import type { QuotaSpend } from './types';

export type YouTubeCallName = keyof typeof quotaUnitsPerCall;

export type YouTubeAnswer<Parsed> = { kind: 'ok'; body: Parsed } | { kind: 'failed'; error: string };

export function startQuota(): QuotaSpend {
  return { search: 0, videos: 0, commentThreads: 0, channels: 0, units: 0 };
}

export function addQuota(spend: QuotaSpend, call: YouTubeCallName): void {
  spend[call] += 1;
  spend.units += quotaUnitsPerCall[call];
}

export async function callYouTube<Parsed>({
  call,
  params,
  schema,
  apiKey,
  fetchResponse,
  spend
}: {
  call: YouTubeCallName;
  params: Record<string, string>;
  schema: z.ZodType<Parsed>;
  apiKey: string;
  fetchResponse: typeof fetch;
  spend: QuotaSpend;
}): Promise<YouTubeAnswer<Parsed>> {
  const query = new URLSearchParams({ ...params, key: apiKey });
  try {
    const response = await fetchWithTimeout(`${YOUTUBE_API_BASE}/${call}?${query}`, {
      fetchResponse,
      timeoutMs: finderThresholds.requestTimeoutMs,
      accept: 'application/json'
    });
    const body: unknown = await response.json();
    if (!response.ok) return { kind: 'failed', error: `${call} answered ${response.status}: ${readApiReason(body)}` };
    addQuota(spend, call);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return { kind: 'failed', error: `${call} answered in an unexpected shape` };
    return { kind: 'ok', body: parsed.data };
  } catch (error) {
    return { kind: 'failed', error: `${call} request failed: ${describeFailure(error)}` };
  }
}

const ApiErrorBody = z.object({ error: z.object({ message: z.string().optional() }).optional() });

function readApiReason(body: unknown): string {
  const parsed = ApiErrorBody.safeParse(body);
  return parsed.success ? (parsed.data.error?.message ?? 'no reason given') : 'no reason given';
}
