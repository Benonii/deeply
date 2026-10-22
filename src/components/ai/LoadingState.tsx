import { useElapsedTime } from '../../lib/hooks';
import { LoaderGrid } from './LoaderGrid';
import { ShimmerText } from './ShimmerText';
import './ai.css';

interface LoadingStateProps {
  label: string;
  startedAt?: number;
}

export const LoadingState = ({ label, startedAt }: LoadingStateProps) => {
  const { elapsedLabel } = useElapsedTime(startedAt);
  return (
    <div role="status" className="ai-loading">
      <LoaderGrid />
      <ShimmerText text={label} />
      <span className="ai-elapsed">{elapsedLabel}</span>
    </div>
  );
};
