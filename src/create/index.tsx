import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Link, navigateTo } from '@farm.js/core/client';
import { usePathname } from '@farm.js/core/navigation';
import { formatCredits, openSignIn, useCredits } from '../account';
import { useConvexClient } from '../platform/convexClient';
import { COST, FREE_COURSES_TEXT } from '../../convex/lib/pricing';
import { LoadingState } from '../components/ai/LoadingState';
import { ThinkingTrace } from '../components/ai/ThinkingTrace';
import './create.css';

import type { TraceStep } from '../types';

const api = anyApi;

function useSlugFromPath() {
  const pathname = usePathname();
  return pathname.match(/^\/create\/([\w-]+)/)?.[1] ?? null;
}

export function CreatePage() {
  const client = useConvexClient();
  if (!client) {
    return (
      <div className="cr">
        <Head />
        <p className="cr-note">
          Course generation needs the Deeply backend, and this copy of the site isn't connected to one.
        </p>
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
        Name a concept or paste a public GitHub repository. Deeply researches it, designs a visual identity from the
        project's brand, and writes a full course: animated diagrams, quick checks, challenges and, for repos, real code
        excerpts quoted verbatim from the source.
      </p>
    </header>
  );
}

function CreateConnected() {
  const slug = useSlugFromPath();
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
  repo: ['https://github.com/sindresorhus/ky', 'https://github.com/pmndrs/zustand', 'https://github.com/redis/redis']
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProblem(null);
    if (credits === null) return openSignIn('Sign in to create a course.');
    setBusy(true);
    try {
      const result = (await create({
        topic: kind === 'repo' ? topic || repoUrl : topic,
        kind,
        repoUrl: kind === 'repo' ? repoUrl : undefined,
        visibility
      })) as CreateResult;
      if (result.status === 'ok') navigateTo(`/create/${result.slug}`);
      else if (result.status === 'auth') openSignIn('Sign in to create a course.');
      else if (result.status === 'credits')
        setProblem(
          <>
            You need {result.needed} credits to create a course. <Link href="/account">Get more credits</Link>
          </>
        );
      else if (result.status === 'rate')
        setProblem(`You've hit the course creation limit. Try again in ${formatWait(result.retryAfterMs)}.`);
      else setProblem(result.message);
    } catch {
      setProblem('Something went wrong starting the course. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="cr-form" onSubmit={submit}>
      <div className="cr-seg" role="radiogroup" aria-label="What to learn">
        {(['concept', 'repo'] as const).map((kindOption) => (
          <button
            key={kindOption}
            type="button"
            role="radio"
            aria-checked={kind === kindOption}
            className={kind === kindOption ? 'on' : ''}
            onClick={() => setKind(kindOption)}
          >
            {kindOption === 'concept' ? 'A concept' : 'A GitHub repo'}
          </button>
        ))}
      </div>

      {kind === 'concept' ? (
        <label className="cr-field">
          <span>Concept</span>
          <input
            id="cr-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. How LLM inference works"
            maxLength={200}
            required
            minLength={3}
          />
        </label>
      ) : (
        <>
          <label className="cr-field">
            <span>Repository URL</span>
            <input
              id="cr-repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/owner/name"
              required
              inputMode="url"
            />
          </label>
          <label className="cr-field">
            <span>Focus (optional)</span>
            <input
              id="cr-focus"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. the storage engine and replication"
              maxLength={200}
            />
          </label>
        </>
      )}

      <div className="cr-examples">
        <span className="muted small">Try:</span>
        {EXAMPLES[kind].map((example) => (
          <button
            key={example}
            type="button"
            className="cr-chip"
            onClick={() => (kind === 'concept' ? setTopic(example) : setRepoUrl(example))}
          >
            {example.replace('https://github.com/', '')}
          </button>
        ))}
      </div>

      <fieldset className="cr-vis">
        <legend>Who can see it</legend>
        <label>
          <input type="radio" name="vis" checked={visibility === 'public'} onChange={() => setVisibility('public')} />{' '}
          Public, listed in the catalog
        </label>
        <label>
          <input
            type="radio"
            name="vis"
            checked={visibility === 'unlisted'}
            onChange={() => setVisibility('unlisted')}
          />{' '}
          Unlisted, anyone with the link
        </label>
      </fieldset>

      <div className="cr-submit">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Starting…' : credits === null ? 'Sign in to create' : `Create course · ${cost} credits`}
        </button>
        <span className="muted small">
          {typeof credits === 'number' ? (
            <>
              You have {formatCredits(credits)} credits
              {short && (
                <>
                  {' '}
                  · <Link href="/account">get more</Link>
                </>
              )}
            </>
          ) : credits === null ? (
            `New accounts get ${FREE_COURSES_TEXT}.`
          ) : (
            ''
          )}{' '}
          Takes about 5 to 15 minutes. If generation fails, your credits are refunded.
        </span>
      </div>
      {problem && (
        <p className="cr-problem" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}

function formatWait(milliseconds: number) {
  const minutes = Math.ceil(milliseconds / 60000);
  return minutes >= 60
    ? `${Math.ceil(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`
    : `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

type Status = 'queued' | 'planning' | 'writing' | 'ready' | 'failed';
const STATUS_LABEL: Record<Status, string> = {
  queued: 'Queued',
  planning: 'Researching and planning',
  writing: 'Writing modules',
  ready: 'Ready',
  failed: 'Failed'
};

function Progress({ slug }: { slug: string }) {
  const data = useQuery(api.courses.getBySlug, { slug });
  const events = useQuery(api.courses.events, data ? { courseId: data.course.id } : 'skip');
  if (data === undefined)
    return (
      <div className="cr-note">
        <LoadingState label="Loading" />
      </div>
    );
  if (data === null)
    return (
      <p className="cr-note">
        No course at this address. <Link href="/create">Create one</Link>
      </p>
    );
  const { course, modules } = data;
  const status = course.status as Status;
  const ready = modules.filter((courseModule: { status: string }) => courseModule.status === 'ready').length;
  const title = course.meta?.title ?? course.topic;
  const isWorking = status !== 'ready' && status !== 'failed';
  const steps: TraceStep[] = [
    {
      label: course.kind === 'repo' ? 'Research the repository' : 'Research the topic',
      state:
        status === 'queued' || status === 'planning'
          ? 'active'
          : status === 'failed' && !modules.length
            ? 'failed'
            : 'done'
    },
    {
      label: 'Plan modules and design the brand',
      state: modules.length ? 'done' : status === 'failed' ? 'failed' : status === 'planning' ? 'active' : 'todo'
    },
    {
      label: `Write modules (${ready}/${modules.length || '…'})`,
      state: !modules.length
        ? 'todo'
        : modules.every(
              (courseModule: { status: string }) => courseModule.status === 'ready' || courseModule.status === 'failed'
            )
          ? 'done'
          : 'active'
    },
    {
      label: 'Write challenges',
      state:
        course.challengesStatus === 'ready'
          ? 'done'
          : course.challengesStatus === 'writing'
            ? 'active'
            : course.challengesStatus === 'failed'
              ? 'failed'
              : 'todo'
    }
  ];

  return (
    <section className="cr-progress" aria-live="polite">
      <div className="cr-progress-top">
        <div>
          {isWorking ? (
            <LoadingState label={STATUS_LABEL[status]} startedAt={course.createdAt} />
          ) : (
            <div className={`cr-status s-${status}`}>{STATUS_LABEL[status]}</div>
          )}
          <h2>{title}</h2>
          {course.meta?.tagline && <p className="muted">{course.meta.tagline}</p>}
        </div>
        <div className="cr-actions">
          {ready > 0 && (
            <Link className="btn primary" href={`/g/${slug}`}>
              {status === 'ready' ? 'Open course' : 'Start reading'} →
            </Link>
          )}
          <Link className="btn ghost" href="/create">
            New course
          </Link>
        </div>
      </div>
      {course.error && <p className="cr-problem">{course.error}</p>}

      <ThinkingTrace
        steps={steps}
        isWorking={isWorking}
        activeLabel={course.kind === 'repo' ? 'Studying the repository' : 'Writing your course'}
        doneLabel={status === 'failed' ? 'Generation stopped' : 'Course written'}
      />

      {modules.length > 0 && (
        <ul className="cr-mods">
          {modules.map(
            (courseModule: {
              n: number;
              status: string;
              outline: { id?: string; title: string; summary: string };
              error: string | null;
            }) => (
              <li key={courseModule.n} className={`m-${courseModule.status}`}>
                <span className="cr-mod-n">{String(courseModule.n).padStart(2, '0')}</span>
                <span className="cr-mod-body">
                  <span className="cr-mod-title">{courseModule.outline.title}</span>
                  <span className="muted small">
                    {courseModule.status === 'failed' ? (courseModule.error ?? 'Failed') : courseModule.outline.summary}
                  </span>
                </span>
                <span className="cr-mod-state">
                  {courseModule.status === 'ready' ? (
                    <Link href={`/g/${slug}/m/${moduleId(courseModule)}`}>Read</Link>
                  ) : courseModule.status === 'writing' ? (
                    'Writing…'
                  ) : courseModule.status === 'failed' ? (
                    'Failed'
                  ) : (
                    'Waiting'
                  )}
                </span>
              </li>
            )
          )}
        </ul>
      )}

      <details className="cr-log" open={status !== 'ready'}>
        <summary>Generation log</summary>
        <ul>
          {(events ?? []).map((event: { id: string; at: number; message: string; level: string }) => (
            <li key={event.id} className={`lv-${event.level}`}>
              <time>{new Date(event.at).toLocaleTimeString()}</time>
              {event.message}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function moduleId(courseModule: { outline: { id?: string }; n: number }) {
  return courseModule.outline.id ?? String(courseModule.n);
}

function MyCourses({ current }: { current: string | null }) {
  const mine = useQuery(api.courses.myCourses, {});
  if (!mine || mine.length === 0) return null;
  return (
    <section className="cr-mine">
      <h3>Your courses</h3>
      <ul>
        {mine.map(
          (course: {
            slug: string;
            title: string;
            status: Status;
            readyModules: number;
            moduleCount: number;
            visibility: string;
          }) => (
            <li key={course.slug} className={course.slug === current ? 'on' : ''}>
              <Link href={course.status === 'ready' ? `/g/${course.slug}` : `/create/${course.slug}`}>
                <span className="cr-mine-title">{course.title}</span>
                <span className="muted small">
                  {STATUS_LABEL[course.status]} · {course.readyModules}/{course.moduleCount} modules ·{' '}
                  {course.visibility}
                </span>
              </Link>
              {course.status !== 'ready' && course.status !== 'failed' && (
                <Link className="small" href={`/create/${course.slug}`}>
                  Progress
                </Link>
              )}
            </li>
          )
        )}
      </ul>
    </section>
  );
}
