import type { BuiltinCourse } from '../../engine/course';
import { crdtsPack } from './pack';

export const crdtsCourse: BuiltinCourse = {
  id: 'crdts',
  title: crdtsPack.title,
  tagline: crdtsPack.tagline,
  summary: crdtsPack.summary,
  kind: crdtsPack.kind,
  brand: crdtsPack.brand,
  format: 'pack',
  pack: crdtsPack
};
