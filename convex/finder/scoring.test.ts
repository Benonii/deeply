import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { keepBest, scoreArticle, scoreChannel, scoreComments, scoreFreshness, scoreVideo } from './scoring';
import { articleWeights, videoWeights } from './weights';
import type { ArticleCandidate, VideoCandidate, VideoJudgement } from './types';

const NOW = Date.parse('2026-11-26T00:00:00Z');

const candidate = (overrides: Partial<VideoCandidate> = {}): VideoCandidate => ({
  youtubeId: 'bD05uGo_sVI',
  title: 'Python generators and yield',
  channel: 'A teaching channel',
  channelId: 'UC00000000000000000000',
  description: '0:00 Intro\n2:00 yield\n6:00 Lazy evaluation',
  chapters: [
    { startSec: 0, title: 'Intro' },
    { startSec: 120, title: 'yield' },
    { startSec: 360, title: 'Lazy evaluation' }
  ],
  durationSec: 600,
  publishedAt: '2025-11-26T00:00:00Z',
  viewCount: 200_000,
  likeCount: 10_000,
  commentCount: 300,
  topComments: [],
  channelRecord: { subscriberCount: 500_000, viewCount: 50_000_000, videoCount: 400 },
  ...overrides
});

const judgement = (overrides: Partial<VideoJudgement> = {}): VideoJudgement => ({
  youtubeId: 'bD05uGo_sVI',
  relevance: 1,
  startSec: 120,
  endSec: 360,
  praiseCount: 12,
  warningCount: 0,
  neutralCount: 8,
  ...overrides
});

const page = (overrides: Partial<ArticleCandidate> = {}): ArticleCandidate => ({
  url: 'https://docs.example/generators',
  title: 'Generators',
  site: 'docs.example',
  publishedAt: '2026-05-01T00:00:00Z',
  wordCount: 2400,
  codeBlockCount: 9,
  minutes: 11,
  ...overrides
});

describe('scoreComments', () => {
  it('reads nothing as a neutral half', () => {
    assert.equal(scoreComments({ praiseCount: 0, warningCount: 0, neutralCount: 0 }), 0.5);
  });

  it('rises with praise and falls with warnings', () => {
    assert.equal(scoreComments({ praiseCount: 20, warningCount: 0, neutralCount: 0 }), 1);
    assert.equal(scoreComments({ praiseCount: 0, warningCount: 20, neutralCount: 0 }), 0);
    assert.equal(scoreComments({ praiseCount: 5, warningCount: 5, neutralCount: 10 }), 0.5);
  });
});

describe('scoreFreshness', () => {
  it('scores a new page at one and a six year old page at zero', () => {
    assert.equal(scoreFreshness('2026-11-26T00:00:00Z', NOW), 1);
    assert.equal(scoreFreshness('2020-11-24T00:00:00Z', NOW), 0);
  });

  it('scores a missing or unreadable date as a neutral half', () => {
    assert.equal(scoreFreshness(undefined, NOW), 0.5);
    assert.equal(scoreFreshness('last Tuesday', NOW), 0.5);
  });
});

describe('scoreChannel', () => {
  it('reads a missing channel record as a neutral half', () => {
    assert.equal(scoreChannel(undefined), 0.5);
  });

  it('ranks a big channel with watched videos above a small one', () => {
    const big = scoreChannel({ subscriberCount: 2_000_000, viewCount: 300_000_000, videoCount: 500 });
    const small = scoreChannel({ subscriberCount: 400, viewCount: 9000, videoCount: 30 });
    assert.ok(big > small, `${big} should beat ${small}`);
    assert.ok(big <= 1 && small >= 0);
  });
});

describe('scoreVideo', () => {
  it('gives a perfect candidate the full weighted score', () => {
    const scored = scoreVideo({
      candidate: candidate({ viewCount: 1_000_000, likeCount: 100_000, publishedAt: '2026-11-26T00:00:00Z' }),
      judgement: judgement({ praiseCount: 20, warningCount: 0, neutralCount: 0 }),
      conceptId: 'python-generators-yield',
      now: NOW
    });
    assert.equal(scored.parts.relevance, 1);
    assert.equal(scored.parts.comments, 1);
    assert.equal(scored.parts.likesPerView, 1);
    assert.equal(scored.parts.freshness, 1);
    assert.ok(scored.score > 0.9, `${scored.score} should be near one`);
  });

  it('weighs relevance heaviest', () => {
    const base = scoreVideo({ candidate: candidate(), judgement: judgement(), conceptId: 'c', now: NOW });
    const vague = scoreVideo({
      candidate: candidate(),
      judgement: judgement({ relevance: 0 }),
      conceptId: 'c',
      now: NOW
    });
    assert.ok(Math.abs(base.score - vague.score - videoWeights.relevance) < 0.001);
  });

  it('keeps the start and end inside the real length', () => {
    const scored = scoreVideo({
      candidate: candidate({ durationSec: 300 }),
      judgement: judgement({ startSec: 120, endSec: 9000 }),
      conceptId: 'c',
      now: NOW
    });
    assert.deepEqual([scored.startSec, scored.endSec], [120, 300]);
  });

  it('falls back to the chapter window when the agent sends an empty one', () => {
    const scored = scoreVideo({
      candidate: candidate(),
      judgement: judgement({ startSec: 120, endSec: 120 }),
      conceptId: 'c',
      now: NOW
    });
    assert.deepEqual([scored.startSec, scored.endSec], [120, 360]);
  });

  it('carries the lesson video block fields through', () => {
    const scored = scoreVideo({ candidate: candidate(), judgement: judgement(), conceptId: 'yield', now: NOW });
    assert.equal(scored.type, 'video');
    assert.equal(scored.youtubeId, 'bD05uGo_sVI');
    assert.equal(scored.channel, 'A teaching channel');
    assert.equal(scored.conceptId, 'yield');
  });

  it('never scores a video above one or below zero', () => {
    const wild = scoreVideo({
      candidate: candidate({ viewCount: 1, likeCount: 900_000_000 }),
      judgement: judgement({ relevance: 1 }),
      conceptId: 'c',
      now: NOW
    });
    assert.ok(wild.score <= 1 && wild.score >= 0);
    assert.equal(wild.parts.likesPerView, 1);
  });
});

describe('scoreArticle', () => {
  it('scores the primary source above a thin aggregator of the same relevance', () => {
    const primary = scoreArticle({
      candidate: page(),
      judgement: { url: page().url, relevance: 1, tier: 1 },
      conceptId: 'c',
      now: NOW
    });
    const farm = scoreArticle({
      candidate: page({ wordCount: 300, codeBlockCount: 0 }),
      judgement: { url: page().url, relevance: 1, tier: 4 },
      conceptId: 'c',
      now: NOW
    });
    assert.ok(primary.score > farm.score, `${primary.score} should beat ${farm.score}`);
    assert.equal(primary.parts.tier, 1);
    assert.equal(farm.parts.tier, 0.25);
  });

  it('weighs relevance heaviest', () => {
    const judged = { url: page().url, relevance: 1, tier: 2 };
    const strong = scoreArticle({ candidate: page(), judgement: judged, conceptId: 'c', now: NOW });
    const weak = scoreArticle({ candidate: page(), judgement: { ...judged, relevance: 0 }, conceptId: 'c', now: NOW });
    assert.ok(Math.abs(strong.score - weak.score - articleWeights.relevance) < 0.001);
  });

  it('carries the lesson article block fields through', () => {
    const scored = scoreArticle({
      candidate: page(),
      judgement: { url: page().url, relevance: 0.8, tier: 1 },
      conceptId: 'generators',
      now: NOW
    });
    assert.equal(scored.type, 'article');
    assert.equal(scored.minutes, 11);
    assert.equal(scored.site, 'docs.example');
    assert.equal(scored.conceptId, 'generators');
  });
});

describe('keepBest', () => {
  it('keeps the highest scores in order', () => {
    const kept = keepBest([{ score: 0.2 }, { score: 0.9 }, { score: 0.5 }], 2);
    assert.deepEqual(kept, [{ score: 0.9 }, { score: 0.5 }]);
  });

  it('leaves the input alone', () => {
    const scored = [{ score: 0.2 }, { score: 0.9 }];
    keepBest(scored, 1);
    assert.deepEqual(scored, [{ score: 0.2 }, { score: 0.9 }]);
  });
});
