import { useState } from 'react';
import { ShimmerText } from './ShimmerText';
import { TraceStepIcon } from './TraceStepIcon';
import './ai.css';

import type { TraceStep } from '../../types';

interface ThinkingTraceProps {
  steps: TraceStep[];
  isWorking: boolean;
  activeLabel: string;
  doneLabel: string;
}

export const ThinkingTrace = ({ steps, isWorking, activeLabel, doneLabel }: ThinkingTraceProps) => {
  const [isManuallyExpanded, setIsManuallyExpanded] = useState<boolean | null>(null);
  const isExpanded = isManuallyExpanded ?? isWorking;
  return (
    <div className={`ai-trace${isWorking ? ' is-working' : ''}`}>
      <button
        type="button"
        className="ai-trace-head"
        aria-expanded={isExpanded}
        onClick={() => setIsManuallyExpanded(!isExpanded)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        <span role="status">
          {isWorking ? <ShimmerText text={activeLabel} /> : <span className="ai-trace-done">{doneLabel}</span>}
        </span>
        <svg className="ai-trace-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="ai-trace-body">
        <ol className="ai-trace-steps">
          {steps.map((step) => (
            <li key={step.label} className={`is-${step.state}`}>
              <TraceStepIcon state={step.state} />
              {step.label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
