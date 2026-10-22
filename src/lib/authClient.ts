import { createAuthClient } from 'better-auth/react';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';

/**
 * Better Auth runs on the deployment's HTTP actions host (*.convex.site).
 * Derive it from the client URL so no extra build-time variable is needed:
 *   https://foo-bar-123.convex.cloud  ->  https://foo-bar-123.convex.site
 *   http://127.0.0.1:3210 (local)     ->  http://127.0.0.1:3211
 */
export function convexSiteUrl(convexUrl: string) {
  if (convexUrl.includes('.convex.cloud')) return convexUrl.replace('.convex.cloud', '.convex.site');
  const u = new URL(convexUrl);
  if (u.port) u.port = String(Number(u.port) + 1);
  return u.toString().replace(/\/$/, '');
}

export function makeAuthClient(convexUrl: string) {
  return createAuthClient({
    baseURL: convexSiteUrl(convexUrl),
    plugins: [convexClient(), crossDomainClient()],
  });
}
export type AuthClient = ReturnType<typeof makeAuthClient>;

let client: AuthClient | null = null;
/** The app-wide auth client, created by AppProviders when a Convex URL is configured. */
export function getAuthClient() {
  return client;
}
export function setAuthClient(c: AuthClient | null) {
  client = c;
}
