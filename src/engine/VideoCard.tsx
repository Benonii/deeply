import { useEffect, useRef, useState } from 'react';

import { useLesson } from './lesson';
import { showToast } from './toast';
import { buildEmbedURL, buildThumbnailURL, collectWatchedSecond, formatClock, loadYouTubeApi } from './youtube';

import type { VideoBlockData } from '../types';

const POLL_MILLISECONDS = 1000;

interface VideoCardProps {
  block: VideoBlockData;
  subjectId: string;
}

export const VideoCard = ({ block, subjectId }: VideoCardProps) => {
  const { recordActivity, activityBySubject } = useLesson();
  const saved = activityBySubject.get(subjectId);
  const savedSec = saved?.detail.kind === 'videoWatch' ? saved.detail.watchedSec : 0;
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionSec, setSessionSec] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const recordRef = useRef(recordActivity);
  const clipSec = block.endSec - block.startSec;
  const watchedSec = Math.max(savedSec, sessionSec);

  useEffect(() => {
    recordRef.current = recordActivity;
  });

  useEffect(() => {
    const frame = frameRef.current;
    if (!isLoaded || !frame) return;
    const watched = new Set<number>();
    let player: YouTubePlayer | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let isCancelled = false;
    const stopTicking = () => {
      if (ticker) clearInterval(ticker);
      ticker = null;
    };
    const save = () => {
      if (!watched.size) return;
      recordRef.current({
        conceptId: block.conceptId,
        subjectId,
        detail: {
          kind: 'videoWatch',
          watchedSec: watched.size,
          startSec: block.startSec,
          endSec: block.endSec
        }
      });
    };
    loadYouTubeApi()
      .then((api) => {
        if (isCancelled) return;
        player = new api.Player(frame, {
          events: {
            onStateChange: (event) => {
              stopTicking();
              if (event.data !== api.PlayerState.PLAYING) {
                save();
                return;
              }
              ticker = setInterval(() => {
                const playedSec = player?.getCurrentTime?.();
                if (playedSec === undefined) return;
                collectWatchedSecond(watched, playedSec, block.startSec, block.endSec);
                setSessionSec(watched.size);
              }, POLL_MILLISECONDS);
            }
          }
        });
      })
      .catch(() => showToast('The video player could not be loaded.'));
    return () => {
      isCancelled = true;
      stopTicking();
      save();
      player?.destroy();
    };
  }, [isLoaded, subjectId, block.conceptId, block.startSec, block.endSec]);

  return (
    <figure className="video">
      <figcaption className="video-head">
        <span className="video-kicker">
          Video · {formatClock(block.startSec)}–{formatClock(block.endSec)}
        </span>
        <span className="video-title">{block.title}</span>
        <span className="video-channel">{block.channel}</span>
      </figcaption>
      <div className="video-stage">
        {isLoaded ? (
          <iframe
            ref={frameRef}
            className="video-frame"
            src={buildEmbedURL({ ...block, origin: window.location.origin })}
            title={block.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className="video-poster" onClick={() => setIsLoaded(true)}>
            <img className="video-thumb" src={buildThumbnailURL(block.youtubeId)} alt="" loading="lazy" />
            <span className="video-play" aria-hidden />
            <span className="video-poster-label">{`Play ${formatClock(clipSec)} from ${formatClock(block.startSec)}`}</span>
          </button>
        )}
      </div>
      <div className="video-foot">
        {watchedSec > 0
          ? `Watched ${formatClock(watchedSec)} of this ${formatClock(clipSec)} clip.`
          : 'Starts and ends on the part that matters.'}
      </div>
    </figure>
  );
};
