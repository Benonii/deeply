import { useState } from 'react';

import { CodeRunPanel } from './CodeRunPanel';
import { isRuntimeReady, runCodeBlock } from './codeWorkers';

import type { CodeRunState, RunnableLanguage } from '../types';

interface CodeRunnerProps {
  language: RunnableLanguage;
  code: string;
  expectedOutput?: string;
}

const LANGUAGE_COPY: Record<RunnableLanguage, { label: string; hint: string }> = {
  python: { label: 'Editable Python code', hint: 'Runs in your browser. The first run downloads Python.' },
  javascript: { label: 'Editable JavaScript code', hint: 'Runs in your browser.' }
};

const MINIMUM_ROWS = 3;
const MAXIMUM_ROWS = 26;

const countRows = (code: string): number => Math.min(Math.max(code.split('\n').length, MINIMUM_ROWS), MAXIMUM_ROWS);

export const CodeRunner = ({ language, code, expectedOutput }: CodeRunnerProps) => {
  const [draft, setDraft] = useState(code);
  const [state, setState] = useState<CodeRunState>({ kind: 'idle' });
  const isWaiting = state.kind === 'booting' || state.kind === 'running';
  const hasEdits = draft !== code;

  const runDraft = async () => {
    if (isWaiting) return;
    setState(
      isRuntimeReady(language) ? { kind: 'running', startedAt: Date.now() } : { kind: 'booting', startedAt: Date.now() }
    );
    const outcome = await runCodeBlock({
      language,
      code: draft,
      onStarted: () => setState({ kind: 'running', startedAt: Date.now() })
    });
    setState(outcome);
  };

  return (
    <div className="runner">
      <textarea
        className="runner-code"
        value={draft}
        rows={countRows(draft)}
        spellCheck={false}
        autoComplete="off"
        aria-label={LANGUAGE_COPY[language].label}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
          event.preventDefault();
          void runDraft();
        }}
      />
      <div className="runner-bar">
        <button
          type="button"
          className="btn primary runner-go"
          title="Run the code (Ctrl+Enter)"
          disabled={isWaiting}
          onClick={() => void runDraft()}
        >
          {isWaiting ? 'Running' : 'Run'}
        </button>
        {hasEdits && (
          <button
            type="button"
            className="btn ghost runner-reset"
            onClick={() => {
              setDraft(code);
              setState({ kind: 'idle' });
            }}
          >
            Reset
          </button>
        )}
        <span className="runner-hint">{LANGUAGE_COPY[language].hint}</span>
      </div>
      {state.kind !== 'idle' && <CodeRunPanel state={state} language={language} expectedOutput={expectedOutput} />}
    </div>
  );
};
