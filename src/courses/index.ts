import type { BuiltinCourse } from '../engine/course';
import { demoCourse } from '../engine/__fixtures__/demoPack';
import { generatorsCourse } from '../engine/__fixtures__/generatorsCourse';
import { showsFixtureCourses } from './catalog';
import { convexCourse } from './convex';
import { crdtsCourse } from './crdts';

export const builtinCourses: BuiltinCourse[] = [
  convexCourse,
  crdtsCourse,
  ...(showsFixtureCourses ? [generatorsCourse, demoCourse] : [])
];
