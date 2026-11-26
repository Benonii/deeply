import { builtinCourses } from '../courses';
import { CourseRoutes } from './CourseRoutes';
import { fromBuiltin } from './model';
import { NotFoundScreen } from './Shell';

import type { CourseSection } from '../types';

export function BuiltinCourseScreen({ courseID, section }: { courseID: string; section?: CourseSection }) {
  const course = builtinCourses.find((candidate) => candidate.id === courseID);
  if (!course) return <NotFoundScreen />;
  return <CourseRoutes course={fromBuiltin(course)} section={section} />;
}
