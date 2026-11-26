import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findChapterWindow, parseChapters } from './chapters';

const description = [
  'Everything about generators in one go.',
  '',
  '0:00 Intro',
  '1:30 - What yield does',
  '04:12 Lazy evaluation',
  '12:05 Sending values back in',
  '',
  'Follow me somewhere else.'
].join('\n');

describe('parseChapters', () => {
  it('reads a YouTube chapter list that starts at zero', () => {
    assert.deepEqual(parseChapters(description), [
      { startSec: 0, title: 'Intro' },
      { startSec: 90, title: 'What yield does' },
      { startSec: 252, title: 'Lazy evaluation' },
      { startSec: 725, title: 'Sending values back in' }
    ]);
  });

  it('reads hours', () => {
    const chapters = parseChapters(['0:00 Start', '10:00 Middle', '1:02:03 End'].join('\n'));
    assert.deepEqual(
      chapters.map((chapter) => chapter.startSec),
      [0, 600, 3723]
    );
  });

  it('reads a list that puts the title before the time', () => {
    const chapters = parseChapters(['Intro 0:00', 'Reconciliation 3:20', 'Fibers 9:45'].join('\n'));
    assert.deepEqual(
      chapters.map((chapter) => chapter.title),
      ['Intro', 'Reconciliation', 'Fibers']
    );
  });

  it('returns nothing when the list does not start at zero', () => {
    assert.deepEqual(parseChapters(['1:00 Late', '2:00 Later', '3:00 Latest'].join('\n')), []);
  });

  it('returns nothing when there are fewer than three timestamps', () => {
    assert.deepEqual(parseChapters(['0:00 Intro', '2:00 The rest'].join('\n')), []);
  });

  it('ignores timestamps that go backwards', () => {
    const chapters = parseChapters(['0:00 Intro', '5:00 Middle', '2:00 Back again', '9:00 End'].join('\n'));
    assert.deepEqual(
      chapters.map((chapter) => chapter.startSec),
      [0, 300, 540]
    );
  });
});

describe('findChapterWindow', () => {
  const chapters = parseChapters(description);

  it('ends a window at the next chapter', () => {
    assert.deepEqual(findChapterWindow(chapters, 900, 90), { startSec: 90, endSec: 252 });
  });

  it('ends the last window at the full length', () => {
    assert.deepEqual(findChapterWindow(chapters, 900, 725), { startSec: 725, endSec: 900 });
  });

  it('falls back to the full length when the start is not a chapter', () => {
    assert.deepEqual(findChapterWindow(chapters, 900, 400), { startSec: 400, endSec: 900 });
  });
});
