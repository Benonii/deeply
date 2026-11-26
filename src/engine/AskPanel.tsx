import { useContext, useEffect, useRef, useState } from 'react';

import { LoadingState } from '../components/ai/LoadingState';
import { useAskSession } from './ask';
import { AskAnswer } from './AskAnswer';
import { ModuleCtx } from './kit';

import type { AskSelection } from '../types';

interface AskPanelProps {
  selection: AskSelection;
  onClose: () => void;
  onSignIn: () => void;
}

const MINIMUM_QUESTION_LENGTH = 3;

export const AskPanel = ({ selection, onClose, onSignIn }: AskPanelProps) => {
  const courseModule = useContext(ModuleCtx);
  const { panel, request, ask } = useAskSession(selection.sectionId);
  const [draft, setDraft] = useState('');
  const [openEarlierId, setOpenEarlierId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const [newest, ...earlier] = panel?.asks ?? [];
  const isCapped = panel ? panel.remainingToday < 1 : false;
  const canSend = draft.trim().length >= MINIMUM_QUESTION_LENGTH && request.kind !== 'sending' && !isCapped;
  const send = () => {
    if (!canSend) return;
    setDraft('');
    ask(selection.quote, draft.trim());
  };

  return (
    <aside className="ask-panel" role="dialog" aria-label="Ask about this passage">
      <header className="ask-panel-head">
        <h3>Ask about this</h3>
        {panel?.isSignedIn && (
          <span className="ask-panel-left">
            {panel.remainingToday} of {panel.dailyLimit} left today
          </span>
        )}
        <button type="button" className="ask-panel-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className="ask-panel-body">
        <p className="ask-quote">{selection.quote}</p>
        {panel && !panel.isSignedIn ? (
          <div className="ask-signin">
            <p>Sign in to ask about a passage. Deeply answers from this course only.</p>
            <button type="button" className="btn primary" onClick={onSignIn}>
              Sign in
            </button>
          </div>
        ) : (
          <form
            className="ask-compose"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <textarea
              ref={inputRef}
              className="ask-input"
              rows={2}
              value={draft}
              maxLength={500}
              placeholder="What do you want to know about it?"
              aria-label="Your question about the selected passage"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) return;
                event.preventDefault();
                send();
              }}
            />
            <div className="ask-compose-foot">
              <button type="submit" className="btn primary ask-send" disabled={!canSend}>
                {request.kind === 'sending' ? 'Asking…' : 'Ask'}
              </button>
              {isCapped && <span className="ask-note">Today's asks are used up. They come back tomorrow.</span>}
            </div>
          </form>
        )}
        {request.kind === 'refused' && <p className="ask-refused">{request.message}</p>}
        {request.kind === 'sending' && !newest && (
          <div className="ask-waiting">
            <LoadingState label="Reading the course" />
          </div>
        )}
        {newest && (
          <AskAnswer
            ask={newest}
            courseTitle={courseModule.course ?? courseModule.subject}
            moduleTitle={courseModule.title}
            currentQuote={selection.quote}
          />
        )}
        {earlier.length > 0 && (
          <section className="ask-earlier">
            <h4>Earlier in this module</h4>
            {earlier.map((earlierAsk) => (
              <div key={earlierAsk.id}>
                <button
                  type="button"
                  className="ask-earlier-question"
                  aria-expanded={openEarlierId === earlierAsk.id}
                  onClick={() => setOpenEarlierId(openEarlierId === earlierAsk.id ? null : earlierAsk.id)}
                >
                  {earlierAsk.question}
                </button>
                {openEarlierId === earlierAsk.id && (
                  <AskAnswer
                    ask={earlierAsk}
                    courseTitle={courseModule.course ?? courseModule.subject}
                    moduleTitle={courseModule.title}
                    currentQuote={selection.quote}
                  />
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </aside>
  );
};
