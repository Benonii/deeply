import { finderThresholds } from './weights';
import type { VideoChapter } from './types';

const CHAPTER_LINE = /^\s*[([]?(\d{1,2}):([0-5]\d)(?::([0-5]\d))?[)\]]?\s*[-–—:.]?\s+(\S.*?)\s*$/;

const LEADING_LABEL = /^\s*(\S.*?)\s+[([]?(\d{1,2}):([0-5]\d)(?::([0-5]\d))?[)\]]?\s*$/;

const toSeconds = (first: string, second: string, third?: string) =>
  third === undefined
    ? Number(first) * 60 + Number(second)
    : Number(first) * 3600 + Number(second) * 60 + Number(third);

function readChapterLine(line: string): VideoChapter | undefined {
  const leading = CHAPTER_LINE.exec(line);
  if (leading !== null)
    return { startSec: toSeconds(leading[1], leading[2], leading[3]), title: leading[4].replace(/\s+/g, ' ') };
  const trailing = LEADING_LABEL.exec(line);
  if (trailing === null) return undefined;
  return { startSec: toSeconds(trailing[2], trailing[3], trailing[4]), title: trailing[1].replace(/\s+/g, ' ') };
}

export function parseChapters(description: string): VideoChapter[] {
  const found: VideoChapter[] = [];
  for (const line of description.split('\n')) {
    const chapter = readChapterLine(line);
    if (chapter === undefined) continue;
    if (found.length === 0 && chapter.startSec !== 0) continue;
    if (found.length > 0 && chapter.startSec <= found[found.length - 1].startSec) continue;
    found.push(chapter);
  }
  return found.length >= finderThresholds.chaptersNeededBeyondMaxDuration ? found : [];
}

export function findChapterWindow(
  chapters: VideoChapter[],
  durationSec: number,
  startSec: number
): { startSec: number; endSec: number } {
  const index = chapters.findIndex((chapter) => chapter.startSec === startSec);
  if (index === -1) return { startSec, endSec: durationSec };
  const next = chapters[index + 1];
  return { startSec, endSec: next === undefined ? durationSec : next.startSec };
}
