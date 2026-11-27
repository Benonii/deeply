'use client';

import { ClientOnly } from '../components/ClientOnly';
import { readCourseSection } from '../lib/routes';
import { GeneratedCourseScreen } from '../platform/GeneratedCourseScreen';

import type { CourseRouteParams } from '../types';

interface GeneratedCoursePageProps {
  params: CourseRouteParams;
}

export const GeneratedCoursePage = ({ params }: GeneratedCoursePageProps) => (
  <ClientOnly>
    <GeneratedCourseScreen slug={params.course} section={readCourseSection(params)} />
  </ClientOnly>
);
