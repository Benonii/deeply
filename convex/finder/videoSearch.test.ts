import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { judgeHardFilters, searchVideoCandidates } from './videoSearch';
import type { ConceptRequest } from './types';

const CONCEPT: ConceptRequest = {
  topic: 'Python iterators',
  conceptId: 'python-generators-yield',
  conceptName: 'Python generators: yield',
  definition: 'a function that pauses at yield and resumes where it left off'
};

const facts = (overrides: Record<string, unknown> = {}) => ({
  id: 'bD05uGo_sVI',
  status: { privacyStatus: 'public', embeddable: true, uploadStatus: 'processed' },
  contentDetails: { duration: 'PT10M' },
  snippet: {
    title: 'Python generators',
    description: 'the yield keyword',
    liveBroadcastContent: 'none',
    channelId: 'UC0',
    channelTitle: 'A channel',
    publishedAt: '2025-01-01T00:00:00Z'
  },
  statistics: { viewCount: '100000', likeCount: '5000', commentCount: '200' },
  ...overrides
});

interface StubOptions {
  searchIds?: string[];
  videos?: Record<string, unknown>[];
  searchStatus?: number;
  commentStatus?: number;
}

const stubFetch = (options: StubOptions = {}) => {
  const calls: string[] = [];
  const fetchResponse = async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url.replace(/[?&]key=[^&]*/, '').split('://')[1]);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.includes('/search'))
      return options.searchStatus !== undefined && options.searchStatus !== 200
        ? json({ error: { message: 'API key not valid' } }, options.searchStatus)
        : json({ items: (options.searchIds ?? ['bD05uGo_sVI']).map((videoId) => ({ id: { videoId } })) });
    if (url.includes('/videos')) return json({ items: options.videos ?? [facts()] });
    if (url.includes('/commentThreads'))
      return options.commentStatus !== undefined && options.commentStatus !== 200
        ? json({ error: { message: 'comments are disabled' } }, options.commentStatus)
        : json({
            items: [{ snippet: { topLevelComment: { snippet: { textOriginal: 'This finally made it click' } } } }]
          });
    if (url.includes('/channels'))
      return json({
        items: [{ id: 'UC0', statistics: { subscriberCount: '900000', viewCount: '9', videoCount: '3' } }]
      });
    return json({}, 404);
  };
  return { calls, fetchResponse };
};

const search = (options: StubOptions = {}, extra: Record<string, unknown> = {}) => {
  const stub = stubFetch(options);
  return searchVideoCandidates({
    concept: CONCEPT,
    fetchResponse: stub.fetchResponse as unknown as typeof fetch,
    youtubeApiKey: 'test-key',
    now: Date.parse('2026-11-26T00:00:00Z'),
    ...extra
  }).then((result) => ({ result, calls: stub.calls }));
};

describe('hard filters', () => {
  it('keeps a public, embeddable ten minute video', () => {
    assert.deepEqual(judgeHardFilters(facts(), undefined), { kind: 'kept', durationSec: 600 });
  });

  it('drops a private or unlisted video', () => {
    const verdict = judgeHardFilters(facts({ status: { privacyStatus: 'unlisted', embeddable: true } }), undefined);
    assert.deepEqual(verdict, { kind: 'rejected', reason: 'it is unlisted' });
  });

  it('drops a video that cannot be embedded', () => {
    const verdict = judgeHardFilters(facts({ status: { privacyStatus: 'public', embeddable: false } }), undefined);
    assert.deepEqual(verdict, { kind: 'rejected', reason: 'it cannot be embedded' });
  });

  it('drops a Short by length and by tag', () => {
    const byLength = judgeHardFilters(facts({ contentDetails: { duration: 'PT45S' } }), undefined);
    assert.deepEqual(byLength, { kind: 'rejected', reason: 'it is a Short (45s)' });
    const byTag = judgeHardFilters(
      facts({
        contentDetails: { duration: 'PT4M' },
        snippet: { title: 'yield in 60 seconds #Shorts', description: '', liveBroadcastContent: 'none' }
      }),
      undefined
    );
    assert.deepEqual(byTag, { kind: 'rejected', reason: 'it is a Short (240s)' });
  });

  it('drops anything under three minutes', () => {
    const verdict = judgeHardFilters(facts({ contentDetails: { duration: 'PT2M30S' } }), undefined);
    assert.deepEqual(verdict, { kind: 'rejected', reason: 'it runs 150s, under the 180s floor' });
  });

  it('drops a video over forty minutes with no chapters but keeps one with chapters', () => {
    const bare = judgeHardFilters(facts({ contentDetails: { duration: 'PT55M' } }), undefined);
    assert.deepEqual(bare, { kind: 'rejected', reason: 'it runs 3300s with no chapters' });
    const chaptered = judgeHardFilters(
      facts({
        contentDetails: { duration: 'PT55M' },
        snippet: {
          title: 'A long one',
          description: '0:00 Intro\n10:00 yield\n30:00 Lazy evaluation',
          liveBroadcastContent: 'none'
        }
      }),
      undefined
    );
    assert.deepEqual(chaptered, { kind: 'kept', durationSec: 3300 });
  });

  it('drops a live stream', () => {
    const verdict = judgeHardFilters(
      facts({ snippet: { title: 'live now', description: '', liveBroadcastContent: 'live' } }),
      undefined
    );
    assert.deepEqual(verdict, { kind: 'rejected', reason: 'it is live' });
  });

  it('drops a video published before the minimum date', () => {
    const verdict = judgeHardFilters(facts(), '2026-01-01T00:00:00Z');
    assert.deepEqual(verdict, {
      kind: 'rejected',
      reason: 'it was published 2025-01-01T00:00:00Z, before 2026-01-01T00:00:00Z'
    });
  });
});

describe('searchVideoCandidates', () => {
  it('spends 100 units a search plus one each for details, comments and channels', async () => {
    const { result } = await search();
    assert.deepEqual(result.quota, { search: 2, videos: 1, commentThreads: 1, channels: 1, units: 203 });
    assert.equal(result.candidates.length, 1);
    assert.deepEqual(result.candidates[0].topComments, ['This finally made it click']);
    assert.deepEqual(result.candidates[0].channelRecord, {
      subscriberCount: 900_000,
      viewCount: 9,
      videoCount: 3
    });
  });

  it('asks for details once for every search hit', async () => {
    const { calls } = await search({ searchIds: ['bD05uGo_sVI', 'dQw4w9WgXcQ'] });
    const detailCalls = calls.filter((call) => call.includes('/videos'));
    assert.equal(detailCalls.length, 1);
    assert.ok(detailCalls[0].includes('bD05uGo_sVI%2CdQw4w9WgXcQ'), detailCalls[0]);
  });

  it('vets ids the agent proposes without spending a search unit', async () => {
    const { result, calls } = await search({}, { searchQueries: [], proposedVideoIds: ['bD05uGo_sVI'] });
    assert.equal(result.quota.search, 0);
    assert.equal(result.quota.units, 3);
    assert.equal(result.candidates.length, 1);
    assert.deepEqual(
      calls.filter((call) => call.includes('/search')),
      []
    );
  });

  it('reports a refused key and spends nothing', async () => {
    const { result } = await search({ searchStatus: 400 });
    assert.match(result.error ?? '', /search answered 400: API key not valid/);
    assert.equal(result.quota.units, 0);
    assert.deepEqual(result.candidates, []);
  });

  it('returns no candidates and one search spend when nothing matches', async () => {
    const { result } = await search({ searchIds: [] });
    assert.deepEqual(result.candidates, []);
    assert.equal(result.quota.units, 200);
  });

  it('keeps a candidate whose comments are turned off', async () => {
    const { result } = await search({ commentStatus: 403 });
    assert.equal(result.candidates.length, 1);
    assert.deepEqual(result.candidates[0].topComments, []);
  });

  it('lists why each dropped video was dropped', async () => {
    const { result } = await search({
      searchIds: ['bD05uGo_sVI', 'dQw4w9WgXcQ'],
      videos: [facts(), facts({ id: 'dQw4w9WgXcQ', contentDetails: { duration: 'PT30S' } })]
    });
    assert.deepEqual(result.rejected, [{ target: 'dQw4w9WgXcQ', reason: 'it is a Short (30s)' }]);
  });
});

describe('ids that answer with nothing', () => {
  it('says so when a proposed id is gone or private', async () => {
    const { result } = await search({}, { searchQueries: [], proposedVideoIds: ['bD05uGo_sVI', 'aaaaaaaaaaa'] });
    assert.deepEqual(
      result.candidates.map((candidate) => candidate.youtubeId),
      ['bD05uGo_sVI']
    );
    assert.deepEqual(result.rejected, [{ target: 'aaaaaaaaaaa', reason: 'it does not exist, or it is private' }]);
  });
});
