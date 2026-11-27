declare module '*.css';
declare const process: { env: Record<string, string | undefined> };
interface ImportMeta {
  glob: (pattern: string, options: { query: '?raw'; import: 'default'; eager: true }) => Record<string, string>;
}
interface YouTubePlayer {
  getCurrentTime?: () => number;
  destroy(): void;
}
interface YouTubePlayerStateEvent {
  data: number;
}
interface YouTubePlayerEvents {
  onReady?: () => void;
  onStateChange?: (event: YouTubePlayerStateEvent) => void;
}
interface YouTubeIframeApi {
  Player: new (element: HTMLIFrameElement, options: { events: YouTubePlayerEvents }) => YouTubePlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
interface Window {
  dataLayer?: unknown[];
  gtag?: (...parameters: unknown[]) => void;
  YT?: YouTubeIframeApi;
  onYouTubeIframeAPIReady?: () => void;
}
