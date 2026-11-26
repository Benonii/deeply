import { COURSE_REQUEST_STAGES } from '../../convex/lib/courseRequests';
import { readStageLabel } from './labels';

import type { CourseRequestStage } from '../../convex/lib/types';

interface BuildStagesProps {
  stage: CourseRequestStage;
  stepsDone: CourseRequestStage[];
}

export const BuildStages = ({ stage, stepsDone }: BuildStagesProps) => {
  const done = new Set(stepsDone);
  return (
    <ol className="cstages" aria-label="Build steps">
      {COURSE_REQUEST_STAGES.map((candidate) => {
        const state = done.has(candidate) ? 'done' : candidate === stage ? 'now' : 'next';
        return (
          <li key={candidate} className={`cstage cstage-${state}`}>
            <span className="cstage-dot" aria-hidden />
            <span className="cstage-name">{readStageLabel(candidate)}</span>
          </li>
        );
      })}
    </ol>
  );
};
