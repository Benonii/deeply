import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  simplify: { kind: 'token bucket', rate: 12, period: MINUTE, capacity: 6 },
  simplifyGlobal: { kind: 'token bucket', rate: 300, period: MINUTE, shards: 4 },
  generateCourse: { kind: 'fixed window', rate: 3, period: HOUR },
  generateCourseDaily: { kind: 'fixed window', rate: 10, period: 24 * HOUR },
  generateCourseGlobal: { kind: 'fixed window', rate: 30, period: HOUR },
  chatMessageDaily: { kind: 'fixed window', rate: 40, period: 24 * HOUR },
  chatMessageGlobal: { kind: 'token bucket', rate: 600, period: MINUTE, capacity: 120, shards: 4 },
  checkout: { kind: 'fixed window', rate: 10, period: HOUR },
  agentKeyCreate: { kind: 'fixed window', rate: 10, period: HOUR },
  agentCall: { kind: 'token bucket', rate: 120, period: MINUTE, capacity: 40 },
  agentCallGlobal: { kind: 'token bucket', rate: 3000, period: MINUTE, capacity: 600, shards: 4 },
  walletCreateGlobal: { kind: 'token bucket', rate: 300, period: HOUR, capacity: 100 }
});
