import { internal } from '../_generated/api';
import { buildConceptKey } from '../finder/concepts';
import { readMappedState } from './engineState';
import { defineAgentTool } from './server';
import { findVideosInput, scoreArticlesInput, scoreVideosInput, vetArticlesInput } from './validators';

import type { Concept, ConceptMap } from '../lib/conceptMapSchema';
import type { ArticleCandidate, ScoredArticle, ScoredVideo, VideoCandidate } from '../finder/types';
import type { RejectedTarget } from '../finder/types';
import type { AgentTool, AgentToolContext, AgentToolResult } from './types';

const DESCRIPTION_CHARS = 400;

const COMMENTS_SHOWN = 8;

interface ConceptRequestFields {
  topic: string;
  conceptId: string;
  conceptName: string;
  definition: string;
}

type ConceptLookup = { kind: 'found'; concept: ConceptRequestFields } | { kind: 'failed'; message: string };

function describeUnknownConcept(map: ConceptMap, conceptId: string): string {
  return `The concept map has no concept "${conceptId}". Its concepts are: ${map.concepts
    .map((concept: Concept) => concept.id)
    .join(', ')}`;
}

async function readConceptRequest(
  context: AgentToolContext,
  requestId: string,
  conceptId: string
): Promise<ConceptLookup> {
  const loaded = await readMappedState(context, requestId);
  if (loaded.kind === 'failed') return { kind: 'failed', message: loaded.message };
  const concept = loaded.map.concepts.find((candidate) => candidate.id === conceptId);
  if (!concept) return { kind: 'failed', message: describeUnknownConcept(loaded.map, conceptId) };
  return {
    kind: 'found',
    concept: {
      topic: loaded.state.request.topic,
      conceptId: concept.id,
      conceptName: concept.name,
      definition: concept.definition
    }
  };
}

function shorten(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= limit ? flat : `${flat.slice(0, limit - 1)}…`;
}

function describeVideoCandidate(candidate: VideoCandidate): string {
  return [
    `- ${candidate.youtubeId} "${candidate.title}" by ${candidate.channel}, ${candidate.durationSec}s, published ${candidate.publishedAt.slice(0, 10)}`,
    `  description: ${shorten(candidate.description, DESCRIPTION_CHARS)}`,
    ...(candidate.chapters.length > 0
      ? [`  chapters: ${candidate.chapters.map((chapter) => `${chapter.startSec}s ${chapter.title}`).join(' | ')}`]
      : ['  chapters: none']),
    ...candidate.topComments.slice(0, COMMENTS_SHOWN).map((comment) => `  comment: ${shorten(comment, 160)}`)
  ].join('\n');
}

function describeArticleCandidate(candidate: ArticleCandidate): string {
  return `- ${candidate.url} "${candidate.title}" on ${candidate.site}, ${candidate.wordCount} words, ${candidate.codeBlockCount} code blocks, ${candidate.minutes} min${candidate.publishedAt ? `, published ${candidate.publishedAt.slice(0, 10)}` : ''}`;
}

function describeRejected(rejected: RejectedTarget[]): string[] {
  return rejected.length === 0 ? [] : ['Dropped:', ...rejected.map((entry) => `- ${entry.target}: ${entry.reason}`)];
}

function describePicks(picks: (ScoredVideo | ScoredArticle)[]): string[] {
  return picks.map((pick) => {
    const parts = Object.entries(pick.parts)
      .map(([name, value]) => `${name} ${value.toFixed(2)}`)
      .join(', ');
    const label = pick.type === 'video' ? `${pick.youtubeId} ${pick.startSec}-${pick.endSec}s` : pick.url;
    return `- ${label} scored ${pick.score.toFixed(3)} (${parts})`;
  });
}

const findVideos = defineAgentTool({
  name: 'find_videos',
  title: 'Find video candidates for one concept',
  description:
    'Search YouTube for one concept of the concept map, or vet video ids you already found. Returns the candidates that passed the hard filters, with what you need to judge them. Results are cached per concept.',
  inputSchema: findVideosInput,
  run: async ({ requestId, conceptId, ...search }, context): Promise<AgentToolResult> => {
    const lookup = await readConceptRequest(context, requestId, conceptId);
    if (lookup.kind === 'failed') return { status: 'failed', message: lookup.message };
    const answer = await context.actionContext.runAction(internal.finder.actions.findVideoCandidates, {
      request: { concept: lookup.concept, ...search }
    });
    if (answer.data === null) return { status: 'failed', message: answer.message };
    const { conceptKey, picks, candidates, rejected, quota, rubric, channelNote } = answer.data;
    if (picks !== null)
      return {
        status: 'ok',
        text: [
          `${answer.message}`,
          `conceptKey: ${conceptKey}`,
          'These were already chosen for this concept. Paste the blocks score_videos gave you, or call find_videos again with refresh true.',
          ...describePicks(picks)
        ].join('\n')
      };
    return {
      status: 'ok',
      text: [
        answer.message,
        `conceptKey: ${conceptKey}`,
        `quota spent: ${quota.units} units`,
        '',
        candidates.length > 0 ? 'Candidates:' : 'No candidate passed the hard filters. Try other search queries.',
        ...candidates.map(describeVideoCandidate),
        ...describeRejected(rejected),
        '',
        'How to judge them:',
        rubric,
        channelNote,
        '',
        `Send your judgements to score_videos with this requestId and conceptId. Deeply scores them from the stored candidate metrics, so send ids and judgements only.`
      ].join('\n')
    };
  }
});

const scoreVideos = defineAgentTool({
  name: 'score_videos',
  title: 'Score the videos you judged',
  description:
    'Send one judgement per video you would accept. Deeply scores them against the stored metrics and comments, keeps the best, and returns video blocks ready to paste into the module.',
  inputSchema: scoreVideosInput,
  run: async ({ requestId, conceptId, judgements, keep }, context): Promise<AgentToolResult> => {
    const lookup = await readConceptRequest(context, requestId, conceptId);
    if (lookup.kind === 'failed') return { status: 'failed', message: lookup.message };
    const answer = await context.actionContext.runMutation(internal.finder.picks.scoreVideos, {
      request: { conceptKey: buildConceptKey(lookup.concept), judgements, keep }
    });
    if (answer.data === null) return { status: 'failed', message: answer.message };
    return {
      status: 'ok',
      text: [
        answer.message,
        ...describePicks(answer.data.picks),
        ...describeRejected(answer.data.unknown),
        '',
        'Paste these blocks into the section that teaches the concept:',
        JSON.stringify(answer.data.blocks)
      ].join('\n')
    };
  }
});

const vetArticles = defineAgentTool({
  name: 'vet_articles',
  title: 'Vet article URLs for one concept',
  description:
    'Send the URLs you found for one concept. Deeply fetches each page, drops the ones that do not answer or parse, and returns what you need to judge the rest.',
  inputSchema: vetArticlesInput,
  run: async ({ requestId, conceptId, urls, refresh }, context): Promise<AgentToolResult> => {
    const lookup = await readConceptRequest(context, requestId, conceptId);
    if (lookup.kind === 'failed') return { status: 'failed', message: lookup.message };
    const answer = await context.actionContext.runAction(internal.finder.actions.vetArticles, {
      request: { concept: lookup.concept, urls, refresh }
    });
    if (answer.data === null) return { status: 'failed', message: answer.message };
    const { conceptKey, picks, candidates, rejected, rubric } = answer.data;
    if (picks !== null)
      return {
        status: 'ok',
        text: [answer.message, `conceptKey: ${conceptKey}`, ...describePicks(picks)].join('\n')
      };
    return {
      status: 'ok',
      text: [
        answer.message,
        `conceptKey: ${conceptKey}`,
        '',
        candidates.length > 0 ? 'Pages that answered:' : 'No page answered. Send other URLs.',
        ...candidates.map(describeArticleCandidate),
        ...describeRejected(rejected),
        '',
        'How to judge them:',
        rubric,
        '',
        'Send your judgements to score_articles with this requestId and conceptId.'
      ].join('\n')
    };
  }
});

const scoreArticles = defineAgentTool({
  name: 'score_articles',
  title: 'Score the articles you judged',
  description:
    'Send one judgement per vetted page you would accept. Deeply scores them against the stored depth and freshness, keeps the best, and returns article blocks ready to paste into the module.',
  inputSchema: scoreArticlesInput,
  run: async ({ requestId, conceptId, judgements, keep }, context): Promise<AgentToolResult> => {
    const lookup = await readConceptRequest(context, requestId, conceptId);
    if (lookup.kind === 'failed') return { status: 'failed', message: lookup.message };
    const answer = await context.actionContext.runMutation(internal.finder.picks.scoreArticles, {
      request: { conceptKey: buildConceptKey(lookup.concept), judgements, keep }
    });
    if (answer.data === null) return { status: 'failed', message: answer.message };
    return {
      status: 'ok',
      text: [
        answer.message,
        ...describePicks(answer.data.picks),
        ...describeRejected(answer.data.unknown),
        '',
        'Paste these blocks into the section that teaches the concept:',
        JSON.stringify(answer.data.blocks)
      ].join('\n')
    };
  }
});

export const FINDER_TOOLS: readonly AgentTool[] = [findVideos, scoreVideos, vetArticles, scoreArticles];
