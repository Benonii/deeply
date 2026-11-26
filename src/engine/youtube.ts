const IFRAME_API_SOURCE = 'https://www.youtube.com/iframe_api';
const EMBED_HOST = 'https://www.youtube-nocookie.com';
const THUMBNAIL_HOST = 'https://i.ytimg.com';

interface EmbedOptions {
  youtubeId: string;
  startSec: number;
  endSec: number;
  origin: string;
}

export function buildEmbedURL({ youtubeId, startSec, endSec, origin }: EmbedOptions) {
  const parameters = new URLSearchParams({
    start: String(startSec),
    end: String(endSec),
    autoplay: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    origin
  });
  return `${EMBED_HOST}/embed/${youtubeId}?${parameters.toString()}`;
}

export function buildThumbnailURL(youtubeId: string) {
  return `${THUMBNAIL_HOST}/vi/${youtubeId}/hqdefault.jpg`;
}

export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function collectWatchedSecond(watched: Set<number>, currentTime: number, startSec: number, endSec: number) {
  const second = Math.floor(currentTime);
  if (second < startSec || second >= endSec) return watched;
  watched.add(second);
  return watched;
}

let pendingApi: Promise<YouTubeIframeApi> | null = null;

export function loadYouTubeApi(): Promise<YouTubeIframeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  pendingApi ??= new Promise<YouTubeIframeApi>((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('The YouTube player API loaded without a player.'));
    };
    const script = document.createElement('script');
    script.src = IFRAME_API_SOURCE;
    script.onerror = () => reject(new Error('The YouTube player API could not be loaded.'));
    document.head.appendChild(script);
  });
  return pendingApi;
}
