import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { query } from './_generated/server';
import authConfig from './auth.config';

// The SPA is served from a different origin than the Convex site URL, so we
// use the crossDomain plugin (session token kept by the client, not a cookie).
const siteUrl = process.env.SITE_URL ?? 'http://localhost:9000';

export const authComponent = createClient<DataModel>(components.betterAuth);

/** Only enable a social provider when its credentials are configured. */
function socialProviders(): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {};
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET };
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  }
  return providers;
}

export const createAuth = (context: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(context),
    socialProviders: socialProviders(),
    // Local testing only: set AUTH_DEV_PASSWORD=1 on a dev deployment to allow email+password.
    emailAndPassword: { enabled: process.env.AUTH_DEV_PASSWORD === '1', requireEmailVerification: false },
    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  });

/** The signed-in Better Auth user, or null. Works in queries, mutations and actions. */
export async function currentUser(context: GenericCtx<DataModel>) {
  return (await authComponent.safeGetAuthUser(context)) ?? null;
}

/** Which sign-in methods are configured, so the UI only shows working buttons. */
export const providers = query({
  args: {},
  handler: async () => ({
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  }),
});
