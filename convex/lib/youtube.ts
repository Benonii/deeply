import { probeUrl } from './webFetch';
import type { UrlProbe, WebFetchOptions } from './types';

export const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

const ISO_DURATION = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;

export function parseIsoDuration(duration: string): number | undefined {
  const match = ISO_DURATION.exec(duration);
  if (match === null) return undefined;
  const [days, hours, minutes, seconds] = [match[1], match[2], match[3], match[4]].map((part) =>
    part === undefined ? 0 : Number(part)
  );
  return days * 86_400 + hours * 3600 + minutes * 60 + seconds;
}

export function buildWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export function buildEmbedUrl({
  youtubeId,
  startSec,
  endSec
}: {
  youtubeId: string;
  startSec: number;
  endSec: number;
}): string {
  const query = new URLSearchParams({ start: String(startSec), end: String(endSec) });
  return `https://www.youtube.com/embed/${youtubeId}?${query}`;
}

export async function probeYouTubeOEmbed(youtubeId: string, options: WebFetchOptions): Promise<UrlProbe> {
  const query = new URLSearchParams({ url: buildWatchUrl(youtubeId), format: 'json' });
  return probeUrl(`https://www.youtube.com/oembed?${query}`, options);
}
