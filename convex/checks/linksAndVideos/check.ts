import { listLinkTargets, listVideoTargets } from '../moduleText';
import { linksAndVideosThresholds } from './thresholds';
import { YouTubeVideoListResponse } from './youtubeSchema';
import type { YouTubeVideoFacts } from './youtubeSchema';
import type { ModulePack } from '../../lib/courseSchema';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem, VideoTarget } from '../types';

const ISO_DURATION = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;

interface Reach {
  status?: number;
  error?: string;
}

export interface LinksAndVideosOptions {
  pack: ModulePack;
  fetchResponse: typeof fetch;
  youtubeApiKey?: string;
}

const describeFailure = (error: unknown) => (error instanceof Error ? error.message : String(error));

const isLive = (status: number) => status >= 200 && status < 400;

export function parseIsoDuration(duration: string): number | undefined {
  const match = ISO_DURATION.exec(duration);
  if (match === null) return undefined;
  const [days, hours, minutes, seconds] = [match[1], match[2], match[3], match[4]].map((part) =>
    part === undefined ? 0 : Number(part)
  );
  return days * 86_400 + hours * 3600 + minutes * 60 + seconds;
}

async function reach(url: string, fetchResponse: typeof fetch): Promise<Reach> {
  let last: Reach = { error: 'never attempted' };
  for (const method of ['HEAD', 'GET'] as const) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), linksAndVideosThresholds.requestTimeoutMs);
    try {
      const response = await fetchResponse(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': linksAndVideosThresholds.browserUserAgent, accept: '*/*' },
        signal: controller.signal
      });
      await response.body?.cancel().catch(() => undefined);
      if (isLive(response.status)) return { status: response.status };
      last = { status: response.status };
    } catch (error) {
      last = { error: describeFailure(error) };
    } finally {
      clearTimeout(timer);
    }
  }
  return last;
}

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
    const response = await fetchResponse(`https://www.googleapis.com/youtube/v3/videos?${query}`, {
      signal: controller.signal
    });
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

async function askOEmbed(youtubeId: string, fetchResponse: typeof fetch): Promise<Reach> {
  const query = new URLSearchParams({ url: `https://www.youtube.com/watch?v=${youtubeId}`, format: 'json' });
  return reach(`https://www.youtube.com/oembed?${query}`, fetchResponse);
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
    const result = await reach(link.url, fetchResponse);
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
      const result = await askOEmbed(video.youtubeId, fetchResponse);
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
