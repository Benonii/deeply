import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { inspectLinksAndVideos } from './check';
import { parseIsoDuration } from '../../lib/youtube';
import { linksAndVideosExamples } from './examples';
import type { ModulePack } from '../../lib/courseSchema';

const VIDEO_ID = 'Bzfu83LiEZs';

const apiBody = (ids: string[], duration: string) => ({
  items: ids.map((id) => ({
    id,
    status: { privacyStatus: 'public', embeddable: true, uploadStatus: 'processed' },
    contentDetails: { duration },
    snippet: { title: 'Python generators', description: 'the yield keyword' }
  }))
});

interface StubOptions {
  deadUrls?: string[];
  headStatus?: number;
  duration?: string;
  knownVideoIds?: string[];
  oEmbedStatus?: number;
}

const stubFetch = (options: StubOptions = {}) => {
  const calls: string[] = [];
  const fetchResponse = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${url}`);
    if (url.startsWith('https://www.googleapis.com/youtube/v3/videos'))
      return new Response(JSON.stringify(apiBody(options.knownVideoIds ?? [VIDEO_ID], options.duration ?? 'PT8M30S')), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    if (url.startsWith('https://www.youtube.com/oembed'))
      return new Response(null, { status: options.oEmbedStatus ?? 200 });
    if ((options.deadUrls ?? []).some((dead) => url.startsWith(dead))) return new Response(null, { status: 404 });
    if (method === 'HEAD' && options.headStatus !== undefined)
      return new Response(null, { status: options.headStatus });
    return new Response(null, { status: 200 });
  };
  return { calls, fetchResponse };
};

const inspect = (pack: ModulePack, options: StubOptions = {}, youtubeApiKey = 'test-key') => {
  const stub = stubFetch(options);
  return inspectLinksAndVideos({ pack, fetchResponse: stub.fetchResponse, youtubeApiKey }).then((outcome) => ({
    outcome,
    calls: stub.calls
  }));
};

describe('parseIsoDuration', () => {
  it('reads hours, minutes and seconds', () => {
    assert.equal(parseIsoDuration('PT1H2M3S'), 3723);
    assert.equal(parseIsoDuration('PT59S'), 59);
    assert.equal(parseIsoDuration('nonsense'), undefined);
  });
});

describe('check 8, links and videos', () => {
  it('passes when every link answers and the video fits its times', async () => {
    const { outcome } = await inspect(linksAndVideosExamples.passing);
    assert.equal(outcome.pass, true);
    assert.deepEqual(outcome.problems, []);
  });

  it('falls back to GET when HEAD is refused', async () => {
    const { outcome, calls } = await inspect(linksAndVideosExamples.passing, { headStatus: 405 });
    assert.equal(outcome.pass, true);
    assert.ok(calls.some((call) => call.startsWith('HEAD https://docs.python.org')));
    assert.ok(calls.some((call) => call.startsWith('GET https://docs.python.org')));
  });

  it('fails a link that answers 404', async () => {
    const { outcome } = await inspect(linksAndVideosExamples.failingDeadLink, {
      deadUrls: ['https://docs.python.org/3/howto/no-such-howto.html']
    });
    assert.equal(outcome.pass, false);
    assert.match(outcome.problems[0].message, /no-such-howto\.html is not reachable: status 404/);
    assert.match(outcome.fixNote, /replace it with a page that loads/);
  });

  it('fails a video whose end time runs past its length', async () => {
    const { outcome } = await inspect(linksAndVideosExamples.failingVideoEndsLate);
    assert.equal(outcome.pass, false);
    assert.match(outcome.problems[0].message, /ends at 99999s but runs 510s/);
  });

  it('fails a video the API does not return', async () => {
    const { outcome } = await inspect(linksAndVideosExamples.failingVideoGone);
    assert.equal(outcome.pass, false);
    assert.match(outcome.problems[0].message, /does not exist or is private/);
  });

  it('fails a video that is only 40 seconds long', async () => {
    const { outcome } = await inspect(linksAndVideosExamples.passing, { duration: 'PT40S' });
    assert.equal(outcome.pass, false);
    assert.match(outcome.problems[0].message, /is a Short \(40s\)/);
  });

  it('passes on oEmbed alone without a key, and says the length is unchecked', async () => {
    const { outcome, calls } = await inspect(linksAndVideosExamples.passing, {}, '');
    assert.equal(outcome.pass, true);
    assert.match(outcome.problems[0].message, /unchecked: video .* length and Short status/);
    assert.ok(!calls.some((call) => call.includes('googleapis.com')));
  });

  it('fails without a key when oEmbed refuses the video', async () => {
    const { outcome } = await inspect(linksAndVideosExamples.passing, { oEmbedStatus: 401 }, '');
    assert.equal(outcome.pass, false);
    assert.match(outcome.problems[0].message, /not public and embeddable: oEmbed answered status 401/);
  });
});
