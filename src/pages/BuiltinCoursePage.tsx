'use client';

import { ClientOnly } from '../components/ClientOnly';
import { readCourseSection } from '../lib/routes';
import { CourseScreen } from '../platform/App';

import type { CourseRouteParams } from '../types';

interface BuiltinCoursePageProps {
  params: CourseRouteParams;
}

export const BuiltinCoursePage = ({ params }: BuiltinCoursePageProps) => (
  <ClientOnly>
    <CourseScreen source="c" courseID={params.course} section={readCourseSection(params)} />
  </ClientOnly>
);
