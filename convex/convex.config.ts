import { defineApp } from 'convex/server';
import betterAuth from '@convex-dev/better-auth/convex.config';
import polar from '@convex-dev/polar/convex.config';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';

const app = defineApp();
app.use(betterAuth);
app.use(polar);
app.use(rateLimiter);
export default app;
