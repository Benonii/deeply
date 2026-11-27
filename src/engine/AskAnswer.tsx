import { buildContinueInClaudePrompt, buildContinueInClaudeURL } from './askPrompt';
import { Markdown } from './md';

import type { AskView } from '../../convex/player/types';

interface AskAnswerProps {
  ask: AskView;
  courseTitle: string;
  moduleTitle: string;
  currentQuote: string;
}

export const AskAnswer = ({ ask, courseTitle, moduleTitle, currentQuote }: AskAnswerProps) => {
  const isAnswering = ask.status === 'answering';
  const claudeURL = buildContinueInClaudeURL(
    buildContinueInClaudePrompt({
      courseTitle,
      moduleTitle,
      quote: ask.quote,
      question: ask.question,
      answer: ask.answer
    })
  );
  return (
    <article className="ask-answer">
      {ask.quote !== currentQuote && <p className="ask-answer-quote">{ask.quote}</p>}
      <h4 className="ask-answer-question">{ask.question}</h4>
      {ask.status === 'failed' ? (
        <p className="ask-answer-failed">{ask.error ?? "That didn't go through."}</p>
      ) : (
        <div className={`ai-stream ask-answer-body${isAnswering && ask.answer.length > 0 ? ' is-revealing' : ''}`}>
          {ask.answer.length > 0 ? (
            <Markdown text={ask.answer} />
          ) : (
            <p className="ask-answer-waiting">Reading the course…</p>
          )}
        </div>
      )}
      {ask.status === 'answered' && (
        <a className="ask-continue" href={claudeURL} target="_blank" rel="noreferrer">
          Continue in Claude
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M7 17 17 7" />
            <path d="M9 7h8v8" />
          </svg>
        </a>
      )}
    </article>
  );
};
