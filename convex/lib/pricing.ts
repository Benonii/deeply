/** Credit economics. One credit ≈ one Simplify call. */
export const FREE_CREDITS_ON_SIGNUP = 40;
export const COST = {
  simplify: 1, // one live rewrite of one block (cached results are free)
  generateCourse: 30, // one full course generation
} as const;
export type UsageKind = keyof typeof COST;
