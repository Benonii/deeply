import { useState } from 'react';
import { Link } from '@farm.js/core/client';

import { BuildStages } from './BuildStages';
import { readStageProgress, readStatusLabel, TOTAL_STAGES } from './labels';

import type { CourseCardView } from '../../convex/lib/types';

interface CourseCardProps {
  card: CourseCardView;
}

const PICKUP_LINE = 'Your Claude picks this up with list_course_requests.';

export const CourseCard = ({ card }: CourseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { status } = card;
  const isBuilding = status.kind === 'building';
  const isWaiting = isBuilding && card.origin === 'chat' && status.stepsDone.length === 0;

  return (
    <article className={`ccard ccard-${status.kind}`}>
      <div className="ccard-head">
        <h3 className="ccard-title">{card.title}</h3>
        <span className="ccard-state">
          {isBuilding && <span className="ccard-live" aria-hidden />}
          {readStatusLabel(status)}
        </span>
      </div>

      {card.tagline && <p className="ccard-tag">{card.tagline}</p>}

      {isBuilding && (
        <div className="ccard-progress">
          <div className="ccard-bar">
            <span style={{ width: `${Math.round(readStageProgress(status.stepsDone) * 100)}%` }} />
          </div>
          <p className="ccard-meter">
            {status.stepsDone.length} of {TOTAL_STAGES} steps done
          </p>
        </div>
      )}

      {status.kind === 'failed' && status.reason && <p className="ccard-reason">{status.reason}</p>}

      {isWaiting && (
        <p className="ccard-pickup">
          {PICKUP_LINE} The key and the add command are on the <Link href="/account">Account page</Link>.
        </p>
      )}

      <div className="ccard-foot">
        {card.href && (
          <Link className="btn primary ccard-open" href={card.href}>
            Open
          </Link>
        )}
        <button
          className="ccard-more"
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Less' : 'Details'}
        </button>
      </div>

      {isExpanded && (
        <div className="ccard-detail">
          {isBuilding && <BuildStages stage={status.stage} stepsDone={status.stepsDone} />}
          <dl className="ccard-facts">
            {card.modules && (
              <div>
                <dt>Modules</dt>
                <dd>
                  {card.modules.ready} of {card.modules.total} written
                </dd>
              </div>
            )}
            {card.modules && card.modules.conceptCount > 0 && (
              <div>
                <dt>Concepts</dt>
                <dd>{card.modules.conceptCount} covered</dd>
              </div>
            )}
            <div>
              <dt>Asked for</dt>
              <dd>{new Date(card.createdAt).toLocaleDateString()}</dd>
            </div>
            {card.origin && (
              <div>
                <dt>Started from</dt>
                <dd>{card.origin === 'chat' ? 'This chat' : 'Your Claude'}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </article>
  );
};
