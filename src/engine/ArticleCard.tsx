import { useEffect, useState } from 'react';

import { useLesson } from './lesson';

import type { ArticleCheckInOutcome } from '../../convex/lib/types';
import type { ArticleBlockData } from '../types';

const checkInOptions: { outcome: ArticleCheckInOutcome; label: string }[] = [
  { outcome: 'finished', label: 'Finished' },
  { outcome: 'partway', label: 'Partway' },
  { outcome: 'skip', label: 'Skip' }
];

interface ArticleCardProps {
  block: ArticleBlockData;
  subjectId: string;
}

export const ArticleCard = ({ block, subjectId }: ArticleCardProps) => {
  const { recordActivity, activityBySubject } = useLesson();
  const saved = activityBySubject.get(subjectId);
  const savedOutcome = saved?.detail.kind === 'articleCheckIn' ? saved.detail.outcome : null;
  const [hasOpened, setHasOpened] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    if (!hasOpened) return;
    const askOnReturn = () => {
      if (document.visibilityState === 'visible') setIsAsking(true);
    };
    window.addEventListener('focus', askOnReturn);
    document.addEventListener('visibilitychange', askOnReturn);
    document.addEventListener('pointerdown', askOnReturn);
    return () => {
      window.removeEventListener('focus', askOnReturn);
      document.removeEventListener('visibilitychange', askOnReturn);
      document.removeEventListener('pointerdown', askOnReturn);
    };
  }, [hasOpened]);

  return (
    <div className="article">
      <a className="article-card" href={block.url} target="_blank" rel="noreferrer" onClick={() => setHasOpened(true)}>
        <span className="article-meta">{`${block.site} · ${block.minutes} min read`}</span>
        <span className="article-title">{block.title}</span>
        <span className="article-go" aria-hidden>
          ↗
        </span>
      </a>
      {(isAsking || savedOutcome !== null) && (
        <div className="article-checkin">
          <span className="article-checkin-ask">{savedOutcome ? 'Saved.' : 'How far did you get?'}</span>
          <span className="article-checkin-options">
            {checkInOptions.map((option) => (
              <button
                key={option.outcome}
                type="button"
                className={`chip ${savedOutcome === option.outcome ? 'on' : ''}`}
                onClick={() =>
                  recordActivity({
                    conceptId: block.conceptId,
                    subjectId,
                    detail: { kind: 'articleCheckIn', outcome: option.outcome }
                  })
                }
              >
                {option.label}
              </button>
            ))}
          </span>
        </div>
      )}
    </div>
  );
};
