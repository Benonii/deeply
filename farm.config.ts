import { betterAuth } from '@farm.js/better-auth';
import { convex } from '@farm.js/convex';
import { convexBetterAuth } from '@farm.js/convex/better-auth';
import { defineConfig } from '@farm.js/core';

const readOptionalValue = (value: string | undefined) => value ?? '';

const auth = convexBetterAuth();

export default defineConfig({
  env: {
    public: {
      CONVEX_URL: readOptionalValue,
      FARM_GA_MEASUREMENT_ID: readOptionalValue
    }
  },
  integrations: {
    convex: convex({
      token: auth.token,
      provider: { module: '@/platform/convexClient', export: 'ConvexClientProvider' }
    }),
    auth: betterAuth({ instance: auth })
  }
});
