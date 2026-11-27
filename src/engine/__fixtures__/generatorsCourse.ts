import { pythonGeneratorsPack } from '../../../convex/lib/fixtures/pythonGenerators';
import type { BuiltinCourse } from '../course';

export const generatorsCourse: BuiltinCourse = {
  id: pythonGeneratorsPack.id,
  title: pythonGeneratorsPack.title,
  tagline: pythonGeneratorsPack.tagline,
  summary: pythonGeneratorsPack.summary,
  kind: pythonGeneratorsPack.kind,
  brand: pythonGeneratorsPack.brand,
  format: 'pack',
  pack: pythonGeneratorsPack
};
