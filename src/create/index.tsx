import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { openSignIn, useCredits } from '../account';
import { useConvexClient } from '../platform/convexClient';
import { COST } from '../../convex/lib/pricing';
import './create.css';

const api = anyApi;

/** Reads `#/create/<slug>` so a progress view survives reloads and can be shared. */
function useSlugFromHash() {
  const read = () => location.hash.match(/^#\/create\/([\w-]+)/)?.[1] ?? null;
  const [slug, setSlug] = useState(read);
  useEffect(() => {
    const on = () => setSlug(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return slug;
}

/** #/create: generate a course from a concept or a GitHub repo, then watch it being written. */
export function CreatePage() {
  const client = useConvexClient();
  if (!client) {
    return (
      <div className="cr">
        <Head />
        <p className="cr-note">Course generation needs the Deeply backend, and this copy of the site isn't connected to one.</p>
      </div>
    );
  }
  return <CreateConnected />;
}

function Head() {
  return (
    <header className="cr-head">
      <div className="eyebrow">Create · AI-written, then validated</div>
      <h1>Learn anything, deeply</h1>
      <p className="lede">
        Name a concept or paste a public GitHub repository. Deeply researches it, designs a visual identity from the project's
        brand, and writes a full course: animated diagrams, quick checks, challenges and, for repos, real code excerpts quoted
        verbatim from the source.
      </p>
    </header>
  );
}

function CreateConnected() {
  const slug = useSlugFromHash();
  return (
    <div className="cr">
      <Head />
      {slug ? <Progress slug={slug} /> : <Form />}
      <MyCourses current={slug} />
    </div>
  );
}

type CreateResult =
  | { status: 'ok'; slug: string }
  | { status: 'auth' }
  | { status: 'credits'; needed: number }
  | { status: 'rate'; retryAfterMs: number }
  | { status: 'invalid'; message: string };

const EXAMPLES = {
  concept: ['How LLM inference works', 'Raft consensus', 'TCP congestion control', 'B-trees and LSM trees'],
  repo: ['https://github.com/sindresorhus/ky', 'https://github.com/pmndrs/zustand', 'https://github.com/redis/redis'],
};

function Form() {
  const create = useMutation(api.courses.create);
  const credits = useCredits();
  const [kind, setKind] = useState<'concept' | 'repo'>('concept');
  const [topic, setTopic] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>('public');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<React.ReactNode>(null);
  const cost = COST.generateCourse;
  const short = typeof credits === 'number' && credits < cost;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);
    if (credits === null) return openSignIn('Sign in to create a course.');
    setBusy(true);
    try {
      const r = (await create({ topic: kind === 'repo' ? topic || repoUrl : topic, kind, repoUrl: kind === 'repo' ? repoUrl : undefined, visibility })) as CreateResult;
      if (r.status === 'ok') location.hash = `#/create/${r.slug}`;
      else if (r.status === 'auth') openSignIn('Sign in to create a course.');
      else if (r.status === 'credits') setProblem(<>You need {r.needed} credits to create a course. <a href="#/account">Get more credits</a></>);
      else if (r.status === 'rate') setProblem(`You've hit the course creation limit. Try again in ${formatWait(r.retryAfterMs)}.`);
      else setProblem(r.message);
    } catch {
      setProblem('Something went wrong starting the course. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="cr-form" onSubmit={submit}>
      <div className="cr-seg" role="radiogroup" aria-label="What to learn">
        {(['concept', 'repo'] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {k === 'concept' ? 'A concept' : 'A GitHub repo'}
          </button>
        ))}
      </div>

      {kind === 'concept' ? (
        <label className="cr-field">
          <span>Concept</span>
          <input id="cr-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How LLM inference works" maxLength={200} required minLength={3} />
        </label>
      ) : (
        <>
          <label className="cr-field">
            <span>Repository URL</span>
            <input id="cr-repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/name" required inputMode="url" />
          </label>
          <label className="cr-field">
            <span>Focus (optional)</span>
            <input id="cr-focus" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. the storage engine and replication" maxLength={200} />
          </label>
        </>
      )}

      <div className="cr-examples">
        <span className="muted small">Try:</span>
        {EXAMPLES[kind].map((ex) => (
          <button key={ex} type="button" className="cr-chip" onClick={() => (kind === 'concept' ? setTopic(ex) : setRepoUrl(ex))}>
            {ex.replace('https://github.com/', '')}
          </button>
        ))}
      </div>

      <fieldset className="cr-vis">
        <legend>Who can see it</legend>
        <label><input type="radio" name="vis" checked={visibility === 'public'} onChange={() => setVisibility('public')} /> Public, listed in the catalog</label>
        <label><input type="radio" name="vis" checked={visibility === 'unlisted'} onChange={() => setVisibility('unlisted')} /> Unlisted, anyone with the link</label>
      </fieldset>

      <div className="cr-submit">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Starting…' : credits === null ? 'Sign in to create' : `Create course · ${cost} credits`}
        </button>
        <span className="muted small">
          {typeof credits === 'number' ? <>You have {credits} credits{short && <> · <a href="#/account">get more</a></>}</> : credits === null ? 'New accounts get free credits.' : ''}
          {' '}Takes about 5 to 15 minutes. If generation fails, your credits are refunded.
        </span>
      </div>
      {problem && <p className="cr-problem" role="alert">{problem}</p>}
    </form>
  );
}

function formatWait(ms: number) {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.ceil(m / 60)} hour${m >= 120 ? 's' : ''}` : `${m} minute${m === 1 ? '' : 's'}`;
}

type Status = 'queued' | 'planning' | 'writing' | 'ready' | 'failed';
const STATUS_LABEL: Record<Status, string> = {
  queued: 'Queued',
  planning: 'Researching and planning',
  writing: 'Writing modules',
  ready: 'Ready',
  failed: 'Failed',
};

function Progress({ slug }: { slug: string }) {
  const data = useQuery(api.courses.getBySlug, { slug });
  const events = useQuery(api.courses.events, data ? { courseId: data.course.id } : 'skip');
  if (data === undefined) return <p className="cr-note">Loading…</p>;
  if (data === null) return <p className="cr-note">No course at this address. <a href="#/create">Create one</a></p>;
  const { course, modules } = data;
  const status = course.status as Status;
  const ready = modules.filter((m: { status: string }) => m.status === 'ready').length;
  const title = course.meta?.title ?? course.topic;
  const steps: { label: string; state: 'done' | 'active' | 'todo' | 'failed' }[] = [
    { label: course.kind === 'repo' ? 'Research the repository' : 'Research the topic', state: status === 'queued' || status === 'planning' ? 'active' : status === 'failed' && !modules.length ? 'failed' : 'done' },
    { label: 'Plan modules and design the brand', state: modules.length ? 'done' : status === 'failed' ? 'failed' : status === 'planning' ? 'active' : 'todo' },
    { label: `Write modules (${ready}/${modules.length || '…'})`, state: !modules.length ? 'todo' : modules.every((m: { status: string }) => m.status === 'ready' || m.status === 'failed') ? 'done' : 'active' },
    { label: 'Write challenges', state: course.challengesStatus === 'ready' ? 'done' : course.challengesStatus === 'writing' ? 'active' : course.challengesStatus === 'failed' ? 'failed' : 'todo' },
  ];

  return (
    <section className="cr-progress" aria-live="polite">
      <div className="cr-progress-top">
        <div>
          <div className={`cr-status s-${status}`}>{status !== 'ready' && status !== 'failed' && <span className="cr-spin" aria-hidden />}{STATUS_LABEL[status]}</div>
          <h2>{title}</h2>
          {course.meta?.tagline && <p className="muted">{course.meta.tagline}</p>}
        </div>
        <div className="cr-actions">
          {ready > 0 && <a className="btn primary" href={`#/g/${slug}`}>{status === 'ready' ? 'Open course' : 'Start reading'} →</a>}
          <a className="btn ghost" href="#/create">New course</a>
        </div>
      </div>
      {course.error && <p className="cr-problem">{course.error}</p>}

      <ol className="cr-steps">
        {steps.map((s) => <li key={s.label} className={`st-${s.state}`}><span className="cr-dot" aria-hidden />{s.label}</li>)}
      </ol>

      {modules.length > 0 && (
        <ul className="cr-mods">
          {modules.map((m: { n: number; status: string; outline: { id?: string; title: string; summary: string }; error: string | null }) => (
            <li key={m.n} className={`m-${m.status}`}>
              <span className="cr-mod-n">{String(m.n).padStart(2, '0')}</span>
              <span className="cr-mod-body">
                <span className="cr-mod-title">{m.outline.title}</span>
                <span className="muted small">{m.status === 'failed' ? m.error ?? 'Failed' : m.outline.summary}</span>
              </span>
              <span className="cr-mod-state">{m.status === 'ready' ? <a href={`#/g/${slug}/m/${moduleId(m)}`}>Read</a> : m.status === 'writing' ? 'Writing…' : m.status === 'failed' ? 'Failed' : 'Waiting'}</span>
            </li>
          ))}
        </ul>
      )}

      <details className="cr-log" open={status !== 'ready'}>
        <summary>Generation log</summary>
        <ul>
          {(events ?? []).map((e: { id: string; at: number; message: string; level: string }) => (
            <li key={e.id} className={`lv-${e.level}`}><time>{new Date(e.at).toLocaleTimeString()}</time>{e.message}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function moduleId(m: { outline: { id?: string }; n: number }) {
  return m.outline.id ?? String(m.n);
}

function MyCourses({ current }: { current: string | null }) {
  const mine = useQuery(api.courses.myCourses, {});
  if (!mine || mine.length === 0) return null;
  return (
    <section className="cr-mine">
      <h3>Your courses</h3>
      <ul>
        {mine.map((c: { slug: string; title: string; status: Status; readyModules: number; moduleCount: number; visibility: string }) => (
          <li key={c.slug} className={c.slug === current ? 'on' : ''}>
            <a href={c.status === 'ready' ? `#/g/${c.slug}` : `#/create/${c.slug}`}>
              <span className="cr-mine-title">{c.title}</span>
              <span className="muted small">
                {STATUS_LABEL[c.status]} · {c.readyModules}/{c.moduleCount} modules · {c.visibility}
              </span>
            </a>
            {c.status !== 'ready' && c.status !== 'failed' && <a className="small" href={`#/create/${c.slug}`}>Progress</a>}
          </li>
        ))}
      </ul>
    </section>
  );
}
