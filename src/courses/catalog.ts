import type { BuiltinCourseLink } from '../types';

export const showsFixtureCourses = (() => {
  try {
    return localStorage.getItem('deeply-fixtures') === '1';
  } catch {
    return false;
  }
})();

export const CONVEX_COURSE_LINK: BuiltinCourseLink = { id: 'convex', title: 'Convex, Deeply' };

export const FIXTURE_COURSE_LINKS: BuiltinCourseLink[] = [
  { id: 'python-generators', title: 'Python generators, Deeply' },
  { id: 'demo', title: 'Caches, Deeply' }
];

export const builtinCourseLinks: BuiltinCourseLink[] = [
  CONVEX_COURSE_LINK,
  { id: 'crdts', title: 'CRDTs, Deeply' },
  ...(showsFixtureCourses ? FIXTURE_COURSE_LINKS : [])
];
