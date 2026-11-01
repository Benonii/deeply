import { betterAuth } from '@farm.js/better-auth';
import { convex } from '@farm.js/convex';
import { convexBetterAuth } from '@farm.js/convex/better-auth';
import { defineConfig } from '@farm.js/core';
import { withDesktopSession } from './src/desktop/desktopAuth';
import { deriveConvexSiteURL, readConvexURL } from './src/lib/deployment';

const readOptionalValue = (value: string | undefined) => value ?? '';

const convexURL = readConvexURL();
const convexSiteURL = deriveConvexSiteURL(convexURL);
const auth = withDesktopSession(convexBetterAuth({ siteURL: convexSiteURL }), convexSiteURL);

export default defineConfig({
  desktop: {
    name: 'Deeply',
    id: 'app.learndeeply.desktop',
    icon: 'brand/deeply-icon-1024.png',
    window: { width: 1280, height: 820 }
  },
  env: {
    public: {
      CONVEX_URL: (value: string | undefined) => value ?? convexURL,
      FARM_GA_MEASUREMENT_ID: readOptionalValue
    }
  },
  integrations: {
    convex: convex({
      url: convexURL,
      token: auth.token,
      provider: { module: '@/platform/convexClient', export: 'ConvexClientProvider' }
    }),
    auth: betterAuth({ instance: auth })
  }
});
