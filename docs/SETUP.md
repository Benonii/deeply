# Production setup

Replace `<deployment>` with your Convex production deployment name (e.g. `happy-otter-123`) and `<site>` with your site origin (e.g. `https://deeply.vercel.app`).

## 1. Convex
Create a **new, empty** Convex project. In Production → Settings, generate a deploy key; it goes into Vercel (step 5).

## 2. Sign-in (Better Auth)
- **GitHub:** github.com/settings/developers → New OAuth App. Homepage `<site>`, callback `<site>/api/auth/callback/github`.
- **Google:** Google Cloud Console → Credentials → OAuth client (Web). Authorized redirect URI `<site>/api/auth/callback/google`.

Sign-in runs on your own domain: Farm forwards `<site>/api/auth/*` to Convex, so session cookies are first-party. Each sign-in button only appears when its keys are set.

## 3. Credits (Polar)
1. Create two one-time products, e.g. 200 credits and 1000 credits. Optionally set metadata `credits` on each.
2. Settings → Webhooks: URL `https://<deployment>.convex.site/polar/events`, events `order.paid`, `product.created`, `product.updated`. Copy the secret.
3. Create an organization access token.
4. If the products existed before the webhook, run `npx convex run billing:syncProducts` once.

## 4. Convex environment variables (Production)
| Variable | Value |
|---|---|
| `SITE_URL` | `<site>` exactly |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | your OpenAI key (default provider) |
| `AI_PROVIDER` | optional; `anthropic` to use Claude instead of OpenAI |
| `ANTHROPIC_API_KEY` | your Anthropic key, when `AI_PROVIDER=anthropic` |
| `AI_MODEL` | optional; overrides the model id (defaults: `gpt-6-luna`, `claude-opus-5-5`) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | from step 2 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from step 2 |
| `POLAR_ORGANIZATION_TOKEN` | from step 3 |
| `POLAR_WEBHOOK_SECRET` | from step 3 |
| `POLAR_SERVER` | `production` (or `sandbox` for testing) |
| `POLAR_PRODUCT_CREDITS_SMALL` / `POLAR_PRODUCT_CREDITS_LARGE` | product ids |
| `GITHUB_TOKEN` | optional; raises GitHub API limits for repo courses |

Never set `GENERATOR_FAKE` or `AUTH_DEV_PASSWORD` in production.

## 5. Vercel
Import the repo; `vercel.json` sets the build. Add `CONVEX_DEPLOY_KEY` (Production), `CONVEX_URL` (Production, `https://<deployment>.convex.cloud`; the server reads it at runtime) and, optionally, `FARM_GA_MEASUREMENT_ID` (a GA4 id like `G-XXXXXXX`) to turn on Google Analytics page views. Each deploy pushes `convex/` and builds the site against that deployment.

## Limits and pricing
Defined in `convex/lib/pricing.ts` and `convex/rateLimits.ts`: 40 free credits on signup, Simplify 1 credit (cached rewrites free), a course 30 credits (refunded if planning fails). Per-user and global rate limits apply to Simplify, course generation and checkout.
