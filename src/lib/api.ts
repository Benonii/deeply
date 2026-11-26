import type { DesktopSessionBody, DesktopSignInBody } from '../types';

async function postJSON(path: string, body: object, fallbackMessage: string): Promise<void> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (response.ok) return;
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(payload?.message ?? fallbackMessage);
}

export function postDesktopSession(body: DesktopSessionBody): Promise<void> {
  return postJSON('/api/desktop/session', body, 'Sign-in failed. Try again.');
}

export function postDesktopSignIn(body: DesktopSignInBody): Promise<void> {
  return postJSON('/api/desktop/sign-in', body, 'Could not open your browser.');
}

export async function fetchConvexAuthToken(): Promise<string | null> {
  const response = await fetch('/api/auth/convex/token', { credentials: 'include' });
  if (!response.ok) return null;
  const payload: unknown = await response.json().catch(() => null);
  if (typeof payload !== 'object' || payload === null || !('token' in payload)) return null;
  return typeof payload.token === 'string' ? payload.token : null;
}
