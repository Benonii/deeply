import { createAuthClient } from 'better-auth/react';
import { convexClient } from '@convex-dev/better-auth/client/plugins';

export function makeAuthClient() {
  return createAuthClient({
    plugins: [convexClient()]
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
