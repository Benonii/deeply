import { findChapterWindow } from './chapters';
import { articleWeights, finderThresholds, videoWeights } from './weights';
import type { ArticleCandidate, ArticleJudgement, ArticleScoreParts, ScoredArticle } from './types';
import type { ChannelRecord, ScoredVideo, VideoCandidate, VideoJudgement, VideoScoreParts } from './types';

const MILLISECONDS_PER_MONTH = 30 * 86_400 * 1000;

const MILLISECONDS_PER_YEAR = 365 * 86_400 * 1000;

export function clampToUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function scaleOnLog(value: number, ceiling: number): number {
  if (value <= 0) return 0;
  return clampToUnit(Math.log10(1 + value) / Math.log10(1 + ceiling));
}

export function scoreFreshness(publishedAt: string | undefined, now: number): number {
  if (publishedAt === undefined || publishedAt.length === 0) return 0.5;
  const published = Date.parse(publishedAt);
  if (Number.isNaN(published)) return 0.5;
  const years = (now - published) / MILLISECONDS_PER_YEAR;
  return clampToUnit((finderThresholds.staleAfterYears - years) / finderThresholds.staleAfterYears);
}

export function scoreComments({
  praiseCount,
  warningCount,
  neutralCount
}: Pick<VideoJudgement, 'praiseCount' | 'warningCount' | 'neutralCount'>): number {
  const total = praiseCount + warningCount + neutralCount;
  if (total === 0) return 0.5;
  return clampToUnit((praiseCount + 0.5 * neutralCount) / total);
}

export function scoreChannel(record: ChannelRecord | undefined): number {
  if (record === undefined) return 0.5;
  const viewsPerVideo = record.videoCount === 0 ? 0 : record.viewCount / record.videoCount;
  return clampToUnit(
    0.5 * scaleOnLog(record.subscriberCount, finderThresholds.subscriberCeiling) +
      0.5 * scaleOnLog(viewsPerVideo, finderThresholds.viewsPerVideoCeiling)
  );
}

export function scoreMonthlyViews(candidate: VideoCandidate, now: number): number {
  const published = Date.parse(candidate.publishedAt);
  if (Number.isNaN(published)) return 0;
  const months = Math.max(1, (now - published) / MILLISECONDS_PER_MONTH);
  return scaleOnLog(candidate.viewCount / months, finderThresholds.monthlyViewsCeiling);
}

export function weighVideoParts(parts: VideoScoreParts): number {
  return (
    parts.relevance * videoWeights.relevance +
    parts.comments * videoWeights.comments +
    parts.likesPerView * videoWeights.likesPerView +
    parts.viewsPerMonth * videoWeights.viewsPerMonth +
    parts.channel * videoWeights.channel +
    parts.freshness * videoWeights.freshness
  );
}

function readTimes(candidate: VideoCandidate, judgement: VideoJudgement) {
  const startSec = Math.min(Math.max(0, Math.round(judgement.startSec)), Math.max(0, candidate.durationSec - 1));
  const endSec = Math.min(Math.round(judgement.endSec), candidate.durationSec);
  if (endSec > startSec) return { startSec, endSec };
  return findChapterWindow(candidate.chapters, candidate.durationSec, startSec);
}

export function scoreVideo({
  candidate,
  judgement,
  conceptId,
  now
}: {
  candidate: VideoCandidate;
  judgement: VideoJudgement;
  conceptId: string;
  now: number;
}): ScoredVideo {
  const parts: VideoScoreParts = {
    relevance: clampToUnit(judgement.relevance),
    comments: scoreComments(judgement),
    likesPerView: clampToUnit(
      (candidate.viewCount === 0 ? 0 : candidate.likeCount / candidate.viewCount) /
        finderThresholds.excellentLikesPerView
    ),
    viewsPerMonth: scoreMonthlyViews(candidate, now),
    channel: scoreChannel(candidate.channelRecord),
    freshness: scoreFreshness(candidate.publishedAt, now)
  };
  const { startSec, endSec } = readTimes(candidate, judgement);
  return {
    type: 'video',
    youtubeId: candidate.youtubeId,
    title: candidate.title,
    channel: candidate.channel,
    startSec,
    endSec,
    conceptId,
    score: Number(weighVideoParts(parts).toFixed(4)),
    parts
  };
}

export function scoreArticle({
  candidate,
  judgement,
  conceptId,
  now
}: {
  candidate: ArticleCandidate;
  judgement: ArticleJudgement;
  conceptId: string;
  now: number;
}): ScoredArticle {
  const tier = Math.min(Math.max(finderThresholds.bestTier, Math.round(judgement.tier)), finderThresholds.worstTier);
  const parts: ArticleScoreParts = {
    relevance: clampToUnit(judgement.relevance),
    tier: (finderThresholds.worstTier + 1 - tier) / finderThresholds.worstTier,
    depth: clampToUnit(
      0.7 * clampToUnit(candidate.wordCount / finderThresholds.deepWordCount) +
        0.3 * clampToUnit(candidate.codeBlockCount / finderThresholds.deepCodeBlockCount)
    ),
    freshness: scoreFreshness(candidate.publishedAt, now)
  };
  const score =
    parts.relevance * articleWeights.relevance +
    parts.tier * articleWeights.tier +
    parts.depth * articleWeights.depth +
    parts.freshness * articleWeights.freshness;
  return {
    type: 'article',
    url: candidate.url,
    title: candidate.title,
    site: candidate.site,
    minutes: candidate.minutes,
    conceptId,
    score: Number(score.toFixed(4)),
    parts
  };
}

export function keepBest<Scored extends { score: number }>(scored: Scored[], limit: number): Scored[] {
  return [...scored].sort((left, right) => right.score - left.score).slice(0, limit);
}
