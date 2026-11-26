import { useState } from 'react';

import { formatWait } from './ask';
import { useLesson } from './lesson';
import { Inline } from './md';

import type { GradeResult } from '../../convex/player/types';
import type {
  ExplainAction,
  ExplainBackBlockData,
  ExplainBackGrade,
  ExplainBackStatus,
  MarkPhase
} from '../types';

interface ExplainBackProps {
  block: ExplainBackBlockData;
  subjectId: string;
}

function readProblem(result: GradeResult): MarkPhase {
  if (result.status === 'graded' || result.status === 'alreadyGraded') return { kind: 'marked' };
  if (result.status === 'auth')
    return { kind: 'problem', message: 'Your answer is saved. Sign in to have it marked against the rubric.' };
  if (result.status === 'rate')
    return {
      kind: 'problem',
      message: `Marking is used up for today. It comes back in ${formatWait(result.retryAfterMs)}.`
    };
  if (result.status === 'unsupported')
    return { kind: 'problem', message: 'Your answer is saved. This course cannot be marked yet.' };
  return { kind: 'problem', message: result.message };
}

const ACTION_HINTS: Record<Exclude<ExplainAction, 'none'>, string> = {
  submit: 'A model marks it against those points and updates the concept.',
  mark: 'Your answer is saved. It has not been marked yet.',
  rewrite: 'Rewrite it to cover the points you missed, then mark it again.'
};

function readStatusLabel({ isMarking, isSaved, grade, metCount }: ExplainBackStatus): string {
  if (isMarking) return 'Marking…';
  if (!grade) return isSaved ? 'Saved · not marked' : '';
  const score = `${metCount} of ${grade.points.length} points`;
  return grade.isPass ? `Marked · ${score}` : `Marked · ${score}, not yet`;
}

function readAction({ isWriting, grade }: { isWriting: boolean; grade: ExplainBackGrade | null }): ExplainAction {
  if (isWriting) return 'submit';
  if (!grade) return 'mark';
  return grade.isPass ? 'none' : 'rewrite';
}

export const ExplainBack = ({ block, subjectId }: ExplainBackProps) => {
  const { submitExplainBack, activityBySubject } = useLesson();
  const saved = activityBySubject.get(subjectId);
  const savedAnswer = saved?.detail.kind === 'explainBack' ? saved.detail : null;
  const grade = savedAnswer?.status === 'graded' ? savedAnswer : null;
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<MarkPhase>({ kind: 'idle' });

  const isWriting = savedAnswer === null || phase.kind === 'rewriting';
  const answer = isWriting ? draft : savedAnswer.text;
  const metCount = grade ? grade.points.filter((point) => point.isMet).length : 0;
  const action = readAction({ isWriting, grade });

  const mark = async () => {
    const text = answer.trim();
    if (text.length === 0) return;
    setPhase({ kind: 'marking' });
    const detail = { kind: 'explainBack' as const, text };
    setPhase(readProblem(await submitExplainBack({ conceptId: block.conceptId, subjectId, detail })));
  };

  return (
    <div className="explain reveal">
      <div className="explain-head">
        <span className="explain-kicker">Explain back</span>
        <span className="explain-status">
          {readStatusLabel({ isMarking: phase.kind === 'marking', isSaved: savedAnswer !== null, grade, metCount })}
        </span>
      </div>
      <div className="explain-prompt">
        <Inline text={block.prompt} />
      </div>
      <textarea
        className="explain-input"
        value={answer}
        readOnly={!isWriting}
        rows={5}
        placeholder="Write it the way you would say it out loud."
        aria-label="Your explanation"
        onChange={(event) => setDraft(event.target.value)}
      />
      {grade && !isWriting ? (
        <ul className="explain-points">
          {block.rubric.map((point, index) => {
            const result = grade.points[index];
            return (
              <li
                key={point}
                className={result?.isMet ? 'met' : 'missed'}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  {result?.isMet ? <path d="M5 13l4 4L19 7" /> : <path d="M6 12h12" />}
                </svg>
                <span className="explain-point">
                  <span className="explain-point-text">{point}</span>
                  {result && <span className="explain-point-note">{result.note}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="explain-rubric">
          <span className="explain-rubric-head">A complete answer covers</span>
          <ul>
            {block.rubric.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      {action !== 'none' && (
        <div className="explain-actions">
          {action === 'rewrite' ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setDraft(savedAnswer?.text ?? '');
                setPhase({ kind: 'rewriting' });
              }}
            >
              Try another answer
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              disabled={answer.trim().length === 0 || phase.kind === 'marking'}
              onClick={mark}
            >
              {phase.kind === 'marking' ? 'Marking…' : action === 'mark' ? 'Mark it' : 'Submit'}
            </button>
          )}
          <span className="explain-hint">{phase.kind === 'problem' ? phase.message : ACTION_HINTS[action]}</span>
        </div>
      )}
    </div>
  );
};
