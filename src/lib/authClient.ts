import { createAuthClient } from 'better-auth/react';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';

export function convexSiteUrl(convexUrl: string) {
  if (convexUrl.includes('.convex.cloud')) return convexUrl.replace('.convex.cloud', '.convex.site');
  const parsedURL = new URL(convexUrl);
  if (parsedURL.port) parsedURL.port = String(Number(parsedURL.port) + 1);
  return parsedURL.toString().replace(/\/$/, '');
}

export function makeAuthClient(convexUrl: string) {
  return createAuthClient({
    baseURL: convexSiteUrl(convexUrl),
    plugins: [convexClient(), crossDomainClient()],
  });
}
export type AuthClient = ReturnType<typeof makeAuthClient>;

let client: AuthClient | null = null;
export function getAuthClient() {
  return client;
}
export function setAuthClient(nextClient: AuthClient | null) {
  client = nextClient;
}
