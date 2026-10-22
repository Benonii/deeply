export const FREE_CREDITS_ON_SIGNUP = 40;
export const COST = {
  simplify: 1,
  generateCourse: 30
} as const;
export type UsageKind = keyof typeof COST;
