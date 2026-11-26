import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildEmbedURL, collectWatchedSecond, formatClock } from './youtube';

const clip = { youtubeId: 'Bzfu83LiEZs', startSec: 10, endSec: 120, origin: 'https://app.example.com' };

describe('youtube clips', () => {
  it('embeds the privacy host, bounded by the clip', () => {
    const url = new URL(buildEmbedURL(clip));
    assert.equal(url.origin, 'https://www.youtube-nocookie.com');
    assert.equal(url.pathname, '/embed/Bzfu83LiEZs');
    assert.equal(url.searchParams.get('start'), '10');
    assert.equal(url.searchParams.get('end'), '120');
    assert.equal(url.searchParams.get('enablejsapi'), '1');
    assert.equal(url.searchParams.get('origin'), clip.origin);
  });

  it('counts each second of the clip once', () => {
    const watched = new Set<number>();
    for (const time of [10.1, 10.9, 11.2, 12.8]) collectWatchedSecond(watched, time, 10, 120);
    assert.equal(watched.size, 3);
  });

  it('ignores time outside the clip', () => {
    const watched = new Set<number>();
    for (const time of [0, 9.9, 120, 300]) collectWatchedSecond(watched, time, 10, 120);
    assert.equal(watched.size, 0);
  });

  it('reads seconds as minutes and seconds', () => {
    assert.equal(formatClock(10), '0:10');
    assert.equal(formatClock(110), '1:50');
    assert.equal(formatClock(3601), '60:01');
  });
});
