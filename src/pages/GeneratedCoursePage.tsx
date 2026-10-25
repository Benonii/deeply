'use client';

import { ClientOnly } from '../components/ClientOnly';
import { readCourseSection } from '../lib/routes';
import { CourseScreen } from '../platform/App';

import type { CourseRouteParams } from '../types';

interface GeneratedCoursePageProps {
  params: CourseRouteParams;
}

export const GeneratedCoursePage = ({ params }: GeneratedCoursePageProps) => (
  <ClientOnly>
    <CourseScreen source="g" courseID={params.course} section={readCourseSection(params)} />
  </ClientOnly>
);
