import type { DesktopSessionBody } from '../types';

export async function postDesktopSession(body: DesktopSessionBody): Promise<void> {
  const response = await fetch('/api/desktop/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (response.ok) return;
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(payload?.message ?? 'Sign-in failed. Try again.');
}
