import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  simplify: { kind: 'token bucket', rate: 12, period: MINUTE, capacity: 6 },
  simplifyGlobal: { kind: 'token bucket', rate: 300, period: MINUTE, shards: 4 },
  generateCourse: { kind: 'fixed window', rate: 3, period: HOUR },
  generateCourseDaily: { kind: 'fixed window', rate: 10, period: 24 * HOUR },
  generateCourseGlobal: { kind: 'fixed window', rate: 30, period: HOUR },
  checkout: { kind: 'fixed window', rate: 10, period: HOUR },
  walletCreateGlobal: { kind: 'token bucket', rate: 300, period: HOUR, capacity: 100 },
});
