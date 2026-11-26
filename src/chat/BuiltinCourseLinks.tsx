import { Link } from '@farm.js/core/client';

import { builtinCourses } from '../courses';

export const BuiltinCourseLinks = () => (
  <nav className="chat-builtin" aria-label="Hand-written courses">
    <p className="chat-builtin-label">Open any time, no account needed</p>
    <ul>
      {builtinCourses.map((builtinCourse) => (
        <li key={builtinCourse.id}>
          <Link href={`/c/${builtinCourse.id}`}>{builtinCourse.title}</Link>
        </li>
      ))}
      <li>
        <Link href="/courses">All courses</Link>
      </li>
    </ul>
  </nav>
);
