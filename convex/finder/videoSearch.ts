import { parseIsoDuration } from '../lib/youtube';
import { YouTubeChannelListResponse, YouTubeCommentThreadsResponse } from '../lib/youtubeSchema';
import { YouTubeSearchResponse, YouTubeVideoListResponse } from '../lib/youtubeSchema';
import { parseChapters } from './chapters';
import { buildSearchQueries } from './concepts';
import { scaleOnLog, scoreFreshness } from './scoring';
import { finderThresholds } from './weights';
import { callYouTube, startQuota } from './youtubeCalls';
import type { YouTubeVideoFacts } from '../lib/youtubeSchema';
import type { ChannelRecord, QuotaSpend, RejectedTarget, VideoCandidate } from './types';
import type { VideoSearchOptions, VideoSearchResult } from './types';

const readCount = (value: string | undefined) => {
  const parsed = Number(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

const shorten = (text: string, limit: number) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= limit ? flat : `${flat.slice(0, limit - 1)}…`;
};

export function judgeHardFilters(
  facts: YouTubeVideoFacts,
  publishedAfter: string | undefined
): { kind: 'kept'; durationSec: number } | { kind: 'rejected'; reason: string } {
  const privacy = facts.status?.privacyStatus;
  if (privacy !== 'public') return { kind: 'rejected', reason: `it is ${privacy ?? 'of unknown privacy'}` };
  if (facts.status?.embeddable !== true) return { kind: 'rejected', reason: 'it cannot be embedded' };
  const broadcast = facts.snippet?.liveBroadcastContent;
  if (broadcast !== undefined && broadcast !== 'none') return { kind: 'rejected', reason: `it is ${broadcast}` };
  const durationSec = parseIsoDuration(facts.contentDetails?.duration ?? '');
  if (durationSec === undefined) return { kind: 'rejected', reason: 'it reports no length' };
  const tags = `${facts.snippet?.title ?? ''} ${facts.snippet?.description ?? ''}`.toLowerCase();
  if (durationSec <= finderThresholds.shortMaxSeconds || tags.includes('#shorts'))
    return { kind: 'rejected', reason: `it is a Short (${durationSec}s)` };
  if (durationSec < finderThresholds.minDurationSec)
    return { kind: 'rejected', reason: `it runs ${durationSec}s, under the ${finderThresholds.minDurationSec}s floor` };
  if (
    durationSec > finderThresholds.maxDurationSec &&
    parseChapters(facts.snippet?.description ?? '').length < finderThresholds.chaptersNeededBeyondMaxDuration
  )
    return { kind: 'rejected', reason: `it runs ${durationSec}s with no chapters` };
  const publishedAt = facts.snippet?.publishedAt ?? '';
  if (publishedAfter !== undefined && Date.parse(publishedAt) < Date.parse(publishedAfter))
    return { kind: 'rejected', reason: `it was published ${publishedAt}, before ${publishedAfter}` };
  return { kind: 'kept', durationSec };
}

const toCandidate = (facts: YouTubeVideoFacts, durationSec: number): VideoCandidate => ({
  youtubeId: facts.id,
  title: facts.snippet?.title ?? '',
  channel: facts.snippet?.channelTitle ?? '',
  channelId: facts.snippet?.channelId ?? '',
  description: shorten(facts.snippet?.description ?? '', finderThresholds.descriptionCharLimit),
  chapters: parseChapters(facts.snippet?.description ?? ''),
  durationSec,
  publishedAt: facts.snippet?.publishedAt ?? '',
  viewCount: readCount(facts.statistics?.viewCount),
  likeCount: readCount(facts.statistics?.likeCount),
  commentCount: readCount(facts.statistics?.commentCount),
  topComments: []
});

const rankWithoutJudgement = (candidate: VideoCandidate, now: number) => {
  const likesPerView = candidate.viewCount === 0 ? 0 : candidate.likeCount / candidate.viewCount;
  return (
    scaleOnLog(candidate.viewCount, finderThresholds.monthlyViewsCeiling) +
    likesPerView / finderThresholds.excellentLikesPerView +
    scoreFreshness(candidate.publishedAt, now)
  );
};

export async function searchVideoCandidates(options: VideoSearchOptions): Promise<VideoSearchResult> {
  const { concept, fetchResponse, youtubeApiKey, publishedAfter } = options;
  const now = options.now ?? Date.now();
  const spend = startQuota();
  const searchedQueries = buildSearchQueries(concept, options.searchQueries);
  const foundIds: string[] = [...new Set(options.proposedVideoIds ?? [])];
  for (const query of searchedQueries) {
    const answer = await callYouTube({
      call: 'search',
      params: {
        part: 'id',
        type: 'video',
        videoEmbeddable: 'true',
        order: 'relevance',
        maxResults: String(finderThresholds.searchResultsPerQuery),
        relevanceLanguage: options.relevanceLanguage ?? 'en',
        q: query,
        ...(publishedAfter === undefined ? {} : { publishedAfter })
      },
      schema: YouTubeSearchResponse,
      apiKey: youtubeApiKey,
      fetchResponse,
      spend
    });
    if (answer.kind === 'failed')
      return { candidates: [], rejected: [], quota: spend, searchedQueries, error: answer.error };
    for (const item of answer.body.items ?? [])
      if (item.id?.videoId !== undefined && !foundIds.includes(item.id.videoId)) foundIds.push(item.id.videoId);
  }
  if (foundIds.length === 0) return { candidates: [], rejected: [], quota: spend, searchedQueries };
  const details = await callYouTube({
    call: 'videos',
    params: {
      part: 'snippet,contentDetails,statistics,status',
      id: foundIds.slice(0, finderThresholds.maxVideoIdsPerRequest).join(',')
    },
    schema: YouTubeVideoListResponse,
    apiKey: youtubeApiKey,
    fetchResponse,
    spend
  });
  if (details.kind === 'failed')
    return { candidates: [], rejected: [], quota: spend, searchedQueries, error: details.error };
  const kept: VideoCandidate[] = [];
  const rejected: RejectedTarget[] = [];
  const answered = new Set<string>();
  for (const facts of details.body.items ?? []) {
    answered.add(facts.id);
    const verdict = judgeHardFilters(facts, publishedAfter);
    if (verdict.kind === 'rejected') {
      rejected.push({ target: facts.id, reason: verdict.reason });
      continue;
    }
    kept.push(toCandidate(facts, verdict.durationSec));
  }
  for (const id of foundIds.slice(0, finderThresholds.maxVideoIdsPerRequest))
    if (!answered.has(id)) rejected.push({ target: id, reason: 'it does not exist, or it is private' });
  const candidates = kept
    .sort((left, right) => rankWithoutJudgement(right, now) - rankWithoutJudgement(left, now))
    .slice(0, finderThresholds.candidateLimit);
  await attachComments(candidates, youtubeApiKey, fetchResponse, spend);
  await attachChannelRecords(candidates, youtubeApiKey, fetchResponse, spend);
  return { candidates, rejected, quota: spend, searchedQueries };
}

async function attachComments(
  candidates: VideoCandidate[],
  apiKey: string,
  fetchResponse: typeof fetch,
  spend: QuotaSpend
): Promise<void> {
  for (const candidate of candidates) {
    if (candidate.commentCount === 0) continue;
    const answer = await callYouTube({
      call: 'commentThreads',
      params: {
        part: 'snippet',
        videoId: candidate.youtubeId,
        order: 'relevance',
        textFormat: 'plainText',
        maxResults: String(finderThresholds.topCommentCount)
      },
      schema: YouTubeCommentThreadsResponse,
      apiKey,
      fetchResponse,
      spend
    });
    if (answer.kind === 'failed') continue;
    candidate.topComments = (answer.body.items ?? [])
      .map((item) => item.snippet?.topLevelComment?.snippet?.textOriginal ?? '')
      .filter((text) => text.length > 0)
      .map((text) => shorten(text, finderThresholds.commentCharLimit));
  }
}

async function attachChannelRecords(
  candidates: VideoCandidate[],
  apiKey: string,
  fetchResponse: typeof fetch,
  spend: QuotaSpend
): Promise<void> {
  const channelIds = [...new Set(candidates.map((candidate) => candidate.channelId).filter((id) => id.length > 0))];
  if (channelIds.length === 0) return;
  const answer = await callYouTube({
    call: 'channels',
    params: { part: 'statistics', id: channelIds.slice(0, finderThresholds.maxVideoIdsPerRequest).join(',') },
    schema: YouTubeChannelListResponse,
    apiKey,
    fetchResponse,
    spend
  });
  if (answer.kind === 'failed') return;
  const records = new Map<string, ChannelRecord>(
    (answer.body.items ?? []).map((item) => [
      item.id,
      {
        subscriberCount: readCount(item.statistics?.subscriberCount),
        viewCount: readCount(item.statistics?.viewCount),
        videoCount: readCount(item.statistics?.videoCount)
      }
    ])
  );
  for (const candidate of candidates) candidate.channelRecord = records.get(candidate.channelId);
}
