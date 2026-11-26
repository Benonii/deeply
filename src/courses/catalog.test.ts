import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { demoCourse } from '../engine/__fixtures__/demoPack';
import { generatorsCourse } from '../engine/__fixtures__/generatorsCourse';
import { builtinCourseLinks, CONVEX_COURSE_LINK, FIXTURE_COURSE_LINKS } from './catalog';
import { crdtsPack } from './crdts/pack';

describe('the built-in course catalog', () => {
  it('lists the hand-written courses by the id and title their packs carry', () => {
    assert.deepEqual(builtinCourseLinks, [CONVEX_COURSE_LINK, { id: crdtsPack.id, title: crdtsPack.title }]);
  });

  it('names the fixture courses the way their packs do', () => {
    assert.deepEqual(FIXTURE_COURSE_LINKS, [
      { id: generatorsCourse.id, title: generatorsCourse.title },
      { id: demoCourse.id, title: demoCourse.title }
    ]);
  });
});
