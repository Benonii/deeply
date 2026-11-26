import { LoadingState } from '../components/ai/LoadingState';
import { normalizeOutput } from '../../convex/lib/outputText';

import type { ActiveCodeRunState, RunnableLanguage } from '../types';

interface CodeRunPanelProps {
  state: ActiveCodeRunState;
  language: RunnableLanguage;
  expectedOutput?: string;
}

const WAITING_LABEL: Record<RunnableLanguage, string> = {
  python: 'Loading Python',
  javascript: 'Starting'
};

const trimTrailingLines = (text: string): string => text.replace(/\n+$/, '');

const formatDuration = (milliseconds: number): string =>
  milliseconds < 1000 ? `${Math.round(milliseconds)} ms` : `${(milliseconds / 1000).toFixed(1)} s`;

const readMatch = (state: ActiveCodeRunState, expectedOutput?: string): boolean | null => {
  if (expectedOutput === undefined || state.kind !== 'printed') return null;
  return normalizeOutput(state.stdout) === normalizeOutput(expectedOutput);
};

export const CodeRunPanel = ({ state, language, expectedOutput }: CodeRunPanelProps) => {
  const isWaiting = state.kind === 'booting' || state.kind === 'running';
  const match = readMatch(state, expectedOutput);
  const hasPrinted = !isWaiting && state.stdout.length > 0;
  const hasStderr = !isWaiting && state.stderr.length > 0;
  return (
    <div className="runner-out" role="status" aria-live="polite">
      <div className="runner-out-head">
        <span className="runner-out-label">Output</span>
        <span className="runner-out-meta">
          {match !== null && (
            <span className={`runner-match ${match ? 'ok' : 'no'}`}>
              {match ? 'Matches the lesson' : 'Differs from the lesson'}
            </span>
          )}
          {!isWaiting && <span className="runner-ms">{formatDuration(state.milliseconds)}</span>}
        </span>
      </div>
      <div className="runner-out-body">
        {isWaiting && (
          <LoadingState
            label={state.kind === 'booting' ? WAITING_LABEL[language] : 'Running'}
            startedAt={state.startedAt}
          />
        )}
        {state.kind === 'raised' && <div className="runner-error">{state.errorLine}</div>}
        {hasPrinted && <pre className="runner-stdout">{trimTrailingLines(state.stdout)}</pre>}
        {hasStderr && <pre className="runner-stderr">{trimTrailingLines(state.stderr)}</pre>}
        {state.kind === 'printed' && !hasPrinted && !hasStderr && (
          <div className="runner-empty">It printed nothing.</div>
        )}
      </div>
    </div>
  );
};
