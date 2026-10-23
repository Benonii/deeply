export const FREE_CREDITS_ON_SIGNUP = 60;
export const COST = {
  simplify: 1,
  generateCourse: 30
} as const;
export type UsageKind = keyof typeof COST;

export function countCourses(credits: number): number {
  return Math.floor(credits / COST.generateCourse);
}

export const FREE_COURSES_TEXT = `${countCourses(FREE_CREDITS_ON_SIGNUP)} free courses`;
