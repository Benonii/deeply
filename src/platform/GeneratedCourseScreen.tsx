import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { usePathname } from '@farm.js/core/navigation';
import { DEEPLY_BRAND } from '../engine/theme';
import { useConvexClient } from './convexClient';
import { CourseRoutes } from './CourseRoutes';
import { CourseSkeleton } from './CourseSkeleton';
import { ErrorBoundary } from './ErrorBoundary';
import { fromGenerated, type GeneratedCourseDoc } from './model';
import { NotFound } from './NotFound';
import { PlatformMessage, PlatformScreen } from './Shell';

import type { CourseSection } from '../types';

function GeneratedCourse({ slug, section }: { slug: string; section?: CourseSection }) {
  const doc = useQuery(anyApi.courses.getBySlug, { slug }) as GeneratedCourseDoc | null | undefined;
  if (doc === undefined) return <CourseSkeleton />;
  if (doc === null)
    return (
      <PlatformScreen>
        <NotFound what="course" back="/" />
      </PlatformScreen>
    );
  const course = fromGenerated(doc, DEEPLY_BRAND);
  if (doc.course.status === 'failed' && !course.modules.some((courseModule) => courseModule.status === 'ready')) {
    return (
      <PlatformScreen>
        <div className="page-head">
          <div className="eyebrow">Generation failed</div>
          <h1>{course.title}</h1>
          <p className="lede">{doc.course.error ?? 'Something went wrong while writing this course.'}</p>
        </div>
      </PlatformScreen>
    );
  }
  return <CourseRoutes course={course} section={section} />;
}

export function GeneratedCourseScreen({ slug, section }: { slug: string; section?: CourseSection }) {
  const client = useConvexClient();
  const route = usePathname();
  if (!client)
    return (
      <PlatformMessage
        title="Community courses need the Deeply backend."
        lede="This copy of the app isn't connected to one."
      />
    );
  return (
    <ErrorBoundary
      resetKey={route}
      fallback={
        <PlatformMessage
          title="Couldn't load this course."
          lede="The course service isn't available right now. Try again in a minute."
        />
      }
    >
      <GeneratedCourse slug={slug} section={section} />
    </ErrorBoundary>
  );
}
