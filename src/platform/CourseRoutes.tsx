import React, { useMemo } from 'react';
import { Link } from '@farm.js/core/client';
import { usePathname } from '@farm.js/core/navigation';
import { LessonContext, useLessonState } from '../engine/lesson';
import { setProgressNamespace } from '../engine/progress';
import { deviceId } from './convexClient';
import { CourseHome, CourseNav, ModulePage, PageView } from './CoursePages';
import { Shell } from './Shell';
import type { ShellCourse } from './model';

import type { CourseSection } from '../types';

export function CourseRoutes({ course, section }: { course: ShellCourse; section?: CourseSection }) {
  const route = usePathname();
  const learnerDeviceID = useMemo(deviceId, []);
  setProgressNamespace(course.id);
  const lesson = useLessonState({
    courseId: course.id,
    basePath: course.base,
    moduleId: section?.id ?? 'home',
    modules: course.modules,
    deviceId: learnerDeviceID
  });
  let body: React.ReactNode;
  if (!section) body = <CourseHome course={course} />;
  else if (section.kind === 'm') body = <ModulePage course={course} moduleId={section.id} />;
  else body = <PageView course={course} pageId={section.id} />;
  return (
    <LessonContext.Provider value={lesson}>
      <Shell
        brand={course.brand}
        nav={
          <>
            <CourseNav course={course} route={route} />
            <nav aria-label="Deeply">
              <div className="nav-label">Deeply</div>
              <Link href="/" className="nav-item">
                <span className="nav-n">◈</span>
                <span className="nav-t">Chat</span>
              </Link>
              <Link href="/courses" className="nav-item">
                <span className="nav-n">◇</span>
                <span className="nav-t">All courses</span>
              </Link>
              <Link href="/create" className="nav-item">
                <span className="nav-n">+</span>
                <span className="nav-t">Create a course</span>
              </Link>
            </nav>
          </>
        }
      >
        {body}
      </Shell>
    </LessonContext.Provider>
  );
}
