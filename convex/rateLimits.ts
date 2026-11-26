import { DAY, HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';

export const ASK_DAILY_LIMIT = readDailyLimit('ASK_DAILY_LIMIT', 20);
const EXPLAIN_BACK_DAILY_LIMIT = readDailyLimit('EXPLAIN_BACK_DAILY_LIMIT', 50);

function readDailyLimit(name: string, fallback: number): number {
  const configured = Number(process.env[name]);
  return Number.isInteger(configured) && configured > 0 ? configured : fallback;
}

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  askDaily: { kind: 'fixed window', rate: ASK_DAILY_LIMIT, period: DAY },
  askGlobal: { kind: 'token bucket', rate: 600, period: HOUR, capacity: 120, shards: 4 },
  explainBackDaily: { kind: 'fixed window', rate: EXPLAIN_BACK_DAILY_LIMIT, period: DAY },
  explainBackGlobal: { kind: 'token bucket', rate: 900, period: HOUR, capacity: 180, shards: 4 },
  simplify: { kind: 'token bucket', rate: 12, period: MINUTE, capacity: 6 },
  simplifyGlobal: { kind: 'token bucket', rate: 300, period: MINUTE, shards: 4 },
  generateCourse: { kind: 'fixed window', rate: 3, period: HOUR },
  generateCourseDaily: { kind: 'fixed window', rate: 10, period: 24 * HOUR },
  generateCourseGlobal: { kind: 'fixed window', rate: 30, period: HOUR },
  checkout: { kind: 'fixed window', rate: 10, period: HOUR },
  agentKeyCreate: { kind: 'fixed window', rate: 10, period: HOUR },
  agentCall: { kind: 'token bucket', rate: 120, period: MINUTE, capacity: 40 },
  agentCallGlobal: { kind: 'token bucket', rate: 3000, period: MINUTE, capacity: 600, shards: 4 },
  walletCreateGlobal: { kind: 'token bucket', rate: 300, period: HOUR, capacity: 100 }
});
