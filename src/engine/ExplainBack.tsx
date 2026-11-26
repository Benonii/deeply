import { useState } from 'react';

import { useLesson } from './lesson';
import { Inline } from './md';

import type { ExplainBackBlockData } from '../types';

interface ExplainBackProps {
  block: ExplainBackBlockData;
  subjectId: string;
}

export const ExplainBack = ({ block, subjectId }: ExplainBackProps) => {
  const { recordActivity, activityBySubject } = useLesson();
  const saved = activityBySubject.get(subjectId);
  const savedText = saved?.detail.kind === 'explainBack' ? saved.detail.text : '';
  const [draft, setDraft] = useState('');
  const [hasJustSent, setHasJustSent] = useState(false);
  const isSent = hasJustSent || savedText.length > 0;
  const answer = savedText.length > 0 ? savedText : draft;

  return (
    <div className="explain reveal">
      <div className="explain-head">
        <span className="explain-kicker">Explain back</span>
        {isSent && <span className="explain-status">Saved · pending grading</span>}
      </div>
      <div className="explain-prompt">
        <Inline text={block.prompt} />
      </div>
      <textarea
        className="explain-input"
        value={answer}
        readOnly={isSent}
        rows={5}
        placeholder="Write it the way you would say it out loud."
        aria-label="Your explanation"
        onChange={(event) => setDraft(event.target.value)}
      />
      {isSent ? (
        <div className="explain-rubric">
          <span className="explain-rubric-head">A complete answer covers</span>
          <ul>
            {block.rubric.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="explain-note">
            A model marks this against those points in a later release. Nothing marks it yet.
          </p>
        </div>
      ) : (
        <div className="explain-actions">
          <button
            type="button"
            className="btn primary"
            disabled={draft.trim().length === 0}
            onClick={() => {
              setHasJustSent(true);
              recordActivity({
                conceptId: block.conceptId,
                subjectId,
                detail: { kind: 'explainBack', text: draft.trim() }
              });
            }}
          >
            Submit
          </button>
          <span className="explain-hint">Saved to your concept record. No grade yet.</span>
        </div>
      )}
    </div>
  );
};
