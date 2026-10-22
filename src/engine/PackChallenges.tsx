import React, { useMemo, useState } from 'react';
import type { Challenge } from '../../convex/lib/courseSchema';
import { buildPrompt, Code, CopyBtn } from './kit';
import { Inline } from './md';
import { useProgress } from './progress';

const L = (k: number) => String.fromCharCode(65 + k);

function Card({ c, solved, onSolve, course }: { c: Challenge; solved: boolean; onSolve: () => void; course: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const copy = () =>
    buildPrompt([course, 'Challenge', c.id], `${c.q}\n${c.code ? '\n```\n' + c.code + '\n```\n' : ''}\nOptions:\n${c.options.map((o, k) => `${L(k)}. ${o}`).join('\n')}\n\n${pick !== null ? `My answer: ${L(pick)} (${pick === c.answer ? 'correct' : `wrong, correct is ${L(c.answer)}`}).\nExplanation shown: ${c.explain}` : 'I have not answered yet. Give me a hint first, not the answer.'}\n\nExplain the underlying idea and why each wrong option is wrong.`);
  return (
    <article className={`ch-card ${solved ? 'solved' : ''}`}>
      <header className="ch-head">
        <span className="ch-meta">{c.topic} · {'●'.repeat(c.difficulty)}{'○'.repeat(3 - c.difficulty)}{c.type !== 'mcq' ? ` · ${c.type === 'bug' ? 'spot the bug' : 'predict'}` : ''}</span>
        <span className="ch-right">{solved && <span className="ch-solved">Solved</span>}<CopyBtn label="Ask" get={copy} /></span>
      </header>
      <div className="check-q"><Inline text={c.q} /></div>
      {c.code && <Code title={c.type === 'bug' ? 'find the bug' : 'code'} lang="text" code={c.code} />}
      <div className="check-opts">
        {c.options.map((o, k) => (
          <button
            key={k}
            disabled={pick !== null}
            className={pick === null ? '' : k === c.answer ? 'right' : k === pick ? 'wrong' : 'dim'}
            onClick={() => { setPick(k); if (k === c.answer) onSolve(); }}
          >
            <span className="opt-letter">{L(k)}</span><span><Inline text={o} /></span>
          </button>
        ))}
      </div>
      {pick !== null && (
        <div className={`check-explain ${pick === c.answer ? 'ok' : 'no'}`}>
          <strong>{pick === c.answer ? 'Correct.' : 'Not quite.'}</strong> <Inline text={c.explain} />
          <button className="link" onClick={() => setPick(null)}>Try again</button>
        </div>
      )}
    </article>
  );
}

export function PackChallenges({ challenges, course }: { challenges: Challenge[]; course: string }) {
  const { progress, solve } = useProgress();
  const topics = useMemo(() => [...new Set(challenges.map((c) => c.topic))], [challenges]);
  const [topic, setTopic] = useState<string | null>(null);
  const [boss, setBoss] = useState(false);
  const list = challenges.filter((c) => !!c.boss === boss && (!topic || c.topic === topic));
  const solved = challenges.filter((c) => progress.challenges[c.id]).length;
  return (
    <div className="ch-page">
      <header className="page-head">
        <div className="eyebrow">Practice · {challenges.length} challenges</div>
        <h1>Challenges</h1>
        <p className="lede">Answer before you look anything up. Each challenge has an Ask button that copies it, with your answer, as a prompt for Claude.</p>
        <div className="ch-score"><div className="bar"><span style={{ width: `${(solved / Math.max(1, challenges.length)) * 100}%` }} /></div><span>{solved}/{challenges.length} solved</span></div>
      </header>
      <div className="ch-filters">
        <div className="seg">
          <button className={!boss ? 'on' : ''} onClick={() => setBoss(false)}>Challenges</button>
          {challenges.some((c) => c.boss) && <button className={boss ? 'on' : ''} onClick={() => setBoss(true)}>Boss level</button>}
        </div>
        <div className="chips">
          <button className={`chip ${topic === null ? 'on' : ''}`} onClick={() => setTopic(null)}>All</button>
          {topics.map((t) => <button key={t} className={`chip ${topic === t ? 'on' : ''}`} onClick={() => setTopic(t)}>{t}</button>)}
        </div>
      </div>
      <div className="ch-list">
        {list.map((c) => <Card key={c.id} c={c} course={course} solved={!!progress.challenges[c.id]} onSolve={() => solve(c.id)} />)}
        {list.length === 0 && <p className="muted">No challenges here.</p>}
      </div>
    </div>
  );
}
