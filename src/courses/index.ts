import type { BuiltinCourse } from '../engine/course';
import { demoCourse } from '../engine/__fixtures__/demoPack';
import { generatorsCourse } from '../engine/__fixtures__/generatorsCourse';
import { convexCourse } from './convex';
import { crdtsCourse } from './crdts';

const fixtures = (() => {
  try {
    return localStorage.getItem('deeply-fixtures') === '1';
  } catch {
    return false;
  }
})();

export const builtinCourses: BuiltinCourse[] = [
  convexCourse,
  crdtsCourse,
  ...(fixtures ? [generatorsCourse, demoCourse] : [])
];
