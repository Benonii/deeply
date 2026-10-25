import type { CourseRouteParams, CourseSection } from '../types';

export function readCourseSection(params: CourseRouteParams): CourseSection | undefined {
  if (params.module) return { kind: 'm', id: params.module };
  if (params.page) return { kind: 'p', id: params.page };
  return undefined;
}
