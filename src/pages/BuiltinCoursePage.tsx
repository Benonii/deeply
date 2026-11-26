'use client';

import { ClientOnly } from '../components/ClientOnly';
import { readCourseSection } from '../lib/routes';
import { BuiltinCourseScreen } from '../platform/BuiltinCourseScreen';

import type { CourseRouteParams } from '../types';

interface BuiltinCoursePageProps {
  params: CourseRouteParams;
}

export const BuiltinCoursePage = ({ params }: BuiltinCoursePageProps) => (
  <ClientOnly>
    <BuiltinCourseScreen courseID={params.course} section={readCourseSection(params)} />
  </ClientOnly>
);
