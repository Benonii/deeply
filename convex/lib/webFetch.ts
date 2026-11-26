import type { UrlProbe, WebFetchOptions } from './types';

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

export function describeFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isLive(status: number): boolean {
  return status >= 200 && status < 400;
}

export async function fetchWithTimeout(url: string, options: WebFetchOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    return await options.fetchResponse(url, {
      method: options.method ?? 'GET',
      redirect: 'follow',
      headers: { 'user-agent': BROWSER_USER_AGENT, accept: options.accept ?? '*/*' },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function probeUrl(url: string, options: WebFetchOptions): Promise<UrlProbe> {
  let lastProbe: UrlProbe = { error: 'never attempted' };
  for (const method of ['HEAD', 'GET'] as const) {
    try {
      const response = await fetchWithTimeout(url, { ...options, method });
      await response.body?.cancel().catch(() => undefined);
      if (isLive(response.status)) return { status: response.status };
      lastProbe = { status: response.status };
    } catch (error) {
      lastProbe = { error: describeFailure(error) };
    }
  }
  return lastProbe;
}
