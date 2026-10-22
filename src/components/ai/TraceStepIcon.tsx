import type { TraceStepState } from '../../types';

interface TraceStepIconProps {
  state: TraceStepState;
}

export const TraceStepIcon = ({ state }: TraceStepIconProps) => {
  if (state === 'active') return <span className="ai-step-spinner" aria-hidden="true" />;
  if (state === 'todo') return <span className="ai-step-pending" aria-hidden="true" />;
  return (
    <svg
      className="ai-step-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={state === 'done' ? 'M20 6L9 17l-5-5' : 'M18 6L6 18M6 6l12 12'} />
    </svg>
  );
};
