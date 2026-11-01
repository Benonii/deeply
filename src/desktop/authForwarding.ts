import { PRODUCTION_WEB_URL } from '../lib/deployment';
import { buildCookieHeader, storeResponseCookies } from './sessionCookies';

const DROPPED_REQUEST_HEADERS = ['connection', 'content-length', 'cookie', 'host', 'origin', 'referer'];
const DROPPED_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'set-cookie', 'transfer-encoding'];
const BODYLESS_METHODS = new Set(['GET', 'HEAD']);
const CONVEX_TOKEN_PATH = '/api/auth/convex/token';
const ONE_TIME_TOKEN_VERIFY_PATH = '/api/auth/one-time-token/verify';

function createForwardHeaders(requestHeaders: Headers): Headers {
  const headers = new Headers(requestHeaders);
  for (const name of DROPPED_REQUEST_HEADERS) headers.delete(name);
  headers.set('accept-encoding', 'identity');
  headers.set('origin', PRODUCTION_WEB_URL);
  const cookieHeader = buildCookieHeader();
  if (cookieHeader) headers.set('cookie', cookieHeader);
  return headers;
}

function copyResponseWithoutCookies(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const name of DROPPED_RESPONSE_HEADERS) headers.delete(name);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function forwardDesktopAuthRequest(request: Request, siteURL: string): Promise<Response> {
  const incomingURL = new URL(request.url);
  const response = await fetch(new URL(`${incomingURL.pathname}${incomingURL.search}`, siteURL), {
    method: request.method,
    headers: createForwardHeaders(request.headers),
    body: BODYLESS_METHODS.has(request.method) ? undefined : request.body,
    redirect: 'manual',
    duplex: 'half'
  } as RequestInit);
  storeResponseCookies(response);
  return copyResponseWithoutCookies(response);
}

export async function fetchDesktopConvexToken(siteURL: string): Promise<string | undefined> {
  const cookieHeader = buildCookieHeader();
  if (!cookieHeader) return undefined;
  const response = await fetch(new URL(CONVEX_TOKEN_PATH, siteURL), {
    headers: { cookie: cookieHeader, 'accept-encoding': 'identity' }
  });
  if (!response.ok) return undefined;
  storeResponseCookies(response);
  const payload = (await response.json()) as { token?: unknown };
  return typeof payload.token === 'string' ? payload.token : undefined;
}

export async function exchangeOneTimeToken(oneTimeToken: string, siteURL: string): Promise<boolean> {
  const response = await fetch(new URL(ONE_TIME_TOKEN_VERIFY_PATH, siteURL), {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: PRODUCTION_WEB_URL, 'accept-encoding': 'identity' },
    body: JSON.stringify({ token: oneTimeToken })
  });
  if (!response.ok) return false;
  storeResponseCookies(response);
  return true;
}
