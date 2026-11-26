import { listLinkTargets, listVideoTargets } from '../moduleText';
import { linksAndVideosThresholds } from './thresholds';
import { describeFailure, isLive, probeUrl } from '../../lib/webFetch';
import { parseIsoDuration, probeYouTubeOEmbed, YOUTUBE_API_BASE } from '../../lib/youtube';
import { YouTubeVideoListResponse } from '../../lib/youtubeSchema';
import type { YouTubeVideoFacts } from '../../lib/youtubeSchema';
import type { UrlProbe } from '../../lib/types';
import type { ModulePack } from '../../lib/courseSchema';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem, VideoTarget } from '../types';

export interface LinksAndVideosOptions {
  pack: ModulePack;
  fetchResponse: typeof fetch;
  youtubeApiKey?: string;
}

const probeOptions = (fetchResponse: typeof fetch) => ({
  fetchResponse,
  timeoutMs: linksAndVideosThresholds.requestTimeoutMs
});

async function askYouTubeApi(
  ids: string[],
  apiKey: string,
  fetchResponse: typeof fetch
): Promise<Map<string, YouTubeVideoFacts> | { error: string }> {
  const query = new URLSearchParams({
    part: 'status,contentDetails,snippet',
    id: ids.slice(0, linksAndVideosThresholds.maxVideoIdsPerRequest).join(','),
    key: apiKey
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), linksAndVideosThresholds.requestTimeoutMs);
  try {
    const response = await fetchResponse(`${YOUTUBE_API_BASE}/videos?${query}`, { signal: controller.signal });
    const body: unknown = await response.json();
    if (!response.ok) return { error: `the YouTube Data API answered ${response.status}` };
    const parsed = YouTubeVideoListResponse.safeParse(body);
    if (!parsed.success) return { error: 'the YouTube Data API answered in an unexpected shape' };
    return new Map((parsed.data.items ?? []).map((item) => [item.id, item]));
  } catch (error) {
    return { error: describeFailure(error) };
  } finally {
    clearTimeout(timer);
  }
}

function judgeFacts(video: VideoTarget, facts: YouTubeVideoFacts): CheckProblem[] {
  const problems: CheckProblem[] = [];
  const privacy = facts.status?.privacyStatus;
  if (privacy !== 'public')
    problems.push({ where: video.where, message: `video ${video.youtubeId} is ${privacy ?? 'of unknown privacy'}` });
  if (facts.status?.embeddable !== true)
    problems.push({ where: video.where, message: `video ${video.youtubeId} cannot be embedded` });
  const duration = parseIsoDuration(facts.contentDetails?.duration ?? '');
  if (duration === undefined) {
    problems.push({ where: video.where, message: `video ${video.youtubeId} reports no length` });
    return problems;
  }
  const tags = `${facts.snippet?.title ?? ''} ${facts.snippet?.description ?? ''}`.toLowerCase();
  if (duration <= linksAndVideosThresholds.shortMaxSeconds || tags.includes('#shorts'))
    problems.push({ where: video.where, message: `video ${video.youtubeId} is a Short (${duration}s)` });
  if (video.endSec > duration)
    problems.push({
      where: video.where,
      message: `video ${video.youtubeId} ends at ${video.endSec}s but runs ${duration}s`
    });
  if (video.startSec >= duration)
    problems.push({
      where: video.where,
      message: `video ${video.youtubeId} starts at ${video.startSec}s but runs ${duration}s`
    });
  return problems;
}

export async function inspectLinksAndVideos({
  pack,
  fetchResponse,
  youtubeApiKey
}: LinksAndVideosOptions): Promise<CheckOutcome> {
  const blocking: CheckProblem[] = [];
  const unchecked: CheckProblem[] = [];
  const notes: string[] = [];
  for (const link of listLinkTargets(pack)) {
    const result = await probeUrl(link.url, probeOptions(fetchResponse));
    if (result.status !== undefined && isLive(result.status)) continue;
    const reason = result.status === undefined ? `the request failed (${result.error})` : `status ${result.status}`;
    blocking.push({ where: link.where, message: `${link.url} is not reachable: ${reason}` });
    notes.push(`the link ${link.url} is not reachable (${reason}); replace it with a page that loads`);
  }
  const videos = listVideoTargets(pack);
  if (videos.length === 0) return { pass: blocking.length === 0, problems: [...blocking], fixNote: notes.join('; ') };
  const facts =
    youtubeApiKey === undefined || youtubeApiKey.length === 0
      ? { error: 'no YouTube Data API key is set' }
      : await askYouTubeApi(
          videos.map((video) => video.youtubeId),
          youtubeApiKey,
          fetchResponse
        );
  if ('error' in facts) {
    for (const video of videos) {
      const result = await probeYouTubeOEmbed(video.youtubeId, probeOptions(fetchResponse));
      if (result.status === undefined || !isLive(result.status)) {
        const reason = result.status === undefined ? result.error : `status ${result.status}`;
        blocking.push({
          where: video.where,
          message: `video ${video.youtubeId} is not public and embeddable: oEmbed answered ${reason}`
        });
        notes.push(`video ${video.youtubeId} cannot be embedded (oEmbed answered ${reason}); pick another video`);
        continue;
      }
      unchecked.push({
        where: video.where,
        message: `unchecked: video ${video.youtubeId} length and Short status, because ${facts.error}`
      });
    }
    return { pass: blocking.length === 0, problems: [...blocking, ...unchecked], fixNote: notes.join('; ') };
  }
  for (const video of videos) {
    const found = facts.get(video.youtubeId);
    if (found === undefined) {
      blocking.push({ where: video.where, message: `video ${video.youtubeId} does not exist or is private` });
      notes.push(`video ${video.youtubeId} is gone from YouTube; find a replacement for that concept`);
      continue;
    }
    const problems = judgeFacts(video, found);
    blocking.push(...problems);
    for (const problem of problems) notes.push(`${problem.message}; pick another video or fix its start and end`);
  }
  return { pass: blocking.length === 0, problems: [...blocking, ...unchecked], fixNote: notes.join('; ') };
}

export const linksAndVideosCheck: CheckModule = {
  checkId: 'links-and-videos',
  version: '1.0.0',
  stage: 'network',
  run: ({ pack }: CheckInput) =>
    inspectLinksAndVideos({ pack, fetchResponse: fetch, youtubeApiKey: process.env.YOUTUBE_API_KEY })
};
