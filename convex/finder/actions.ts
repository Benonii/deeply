import { v } from 'convex/values';

import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';
import { vetArticleUrls } from './articles';
import { isFresh } from './cache';
import { buildConceptKey } from './concepts';
import { articleJudgementRubric, channelProxyNote, videoJudgementRubric } from './rubric';
import { searchVideoCandidates } from './videoSearch';
import { FindVideoCandidatesRequest, VetArticlesRequest } from './validators';
import { StoredArticleCandidates, StoredArticlePicks } from './validators';
import { StoredVideoCandidates, StoredVideoPicks } from './validators';
import { startQuota } from './youtubeCalls';
import type { ArticleCandidatesData, FinderAnswer, VideoCandidatesData } from './types';

const emptyVideoAnswer = (conceptKey: string): VideoCandidatesData => ({
  conceptKey,
  fromCache: false,
  picks: null,
  candidates: [],
  rejected: [],
  quota: startQuota(),
  searchedQueries: [],
  rubric: videoJudgementRubric,
  channelNote: channelProxyNote
});

export const findVideoCandidates = internalAction({
  args: { request: v.any() },
  handler: async (context, { request }): Promise<FinderAnswer<VideoCandidatesData>> => {
    const parsed = FindVideoCandidatesRequest.safeParse(request);
    if (!parsed.success)
      return { data: null, message: `the request does not match the schema: ${parsed.error.message}` };
    const { concept, refresh, ...search } = parsed.data;
    const conceptKey = buildConceptKey(concept);
    const cached = await context.runQuery(internal.finder.cache.loadConcept, { conceptKey });
    if (!refresh && cached !== null && isFresh(cached, Date.now())) {
      const picks = StoredVideoPicks.safeParse(cached.videos ?? []);
      if (picks.success && picks.data.length > 0)
        return {
          data: { ...emptyVideoAnswer(conceptKey), fromCache: true, picks: picks.data },
          message: `cache hit for ${conceptKey}: ${picks.data.length} chosen video(s), 0 quota units`
        };
      const stored = StoredVideoCandidates.safeParse(cached.videoCandidates ?? []);
      if (stored.success && stored.data.length > 0)
        return {
          data: { ...emptyVideoAnswer(conceptKey), fromCache: true, candidates: stored.data },
          message: `cache hit for ${conceptKey}: ${stored.data.length} candidate(s) awaiting judgement, 0 quota units`
        };
    }
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (youtubeApiKey === undefined || youtubeApiKey.length === 0)
      return { data: null, message: 'no YOUTUBE_API_KEY is set on this deployment' };
    const found = await searchVideoCandidates({ concept, fetchResponse: fetch, youtubeApiKey, ...search });
    await context.runMutation(internal.finder.cache.recordQuota, { conceptKey, spend: found.quota });
    const answer: VideoCandidatesData = {
      ...emptyVideoAnswer(conceptKey),
      candidates: found.candidates,
      rejected: found.rejected,
      quota: found.quota,
      searchedQueries: found.searchedQueries
    };
    if (found.error !== undefined)
      return { data: answer, message: `the YouTube Data API refused the call: ${found.error}` };
    await context.runMutation(internal.finder.cache.saveVideoCandidates, {
      conceptKey,
      topic: concept.topic,
      conceptName: concept.conceptName,
      conceptId: concept.conceptId,
      videoCandidates: found.candidates,
      quotaUnits: found.quota.units
    });
    return {
      data: answer,
      message: `${found.candidates.length} candidate(s) passed the hard filters, ${found.rejected.length} were dropped, ${found.quota.units} quota units spent`
    };
  }
});

export const vetArticles = internalAction({
  args: { request: v.any() },
  handler: async (context, { request }): Promise<FinderAnswer<ArticleCandidatesData>> => {
    const parsed = VetArticlesRequest.safeParse(request);
    if (!parsed.success)
      return { data: null, message: `the request does not match the schema: ${parsed.error.message}` };
    const { concept, urls, refresh } = parsed.data;
    const conceptKey = buildConceptKey(concept);
    const blank: ArticleCandidatesData = {
      conceptKey,
      fromCache: false,
      picks: null,
      candidates: [],
      rejected: [],
      rubric: articleJudgementRubric
    };
    const cached = await context.runQuery(internal.finder.cache.loadConcept, { conceptKey });
    if (!refresh && cached !== null && isFresh(cached, Date.now())) {
      const picks = StoredArticlePicks.safeParse(cached.articles ?? []);
      if (picks.success && picks.data.length > 0)
        return {
          data: { ...blank, fromCache: true, picks: picks.data },
          message: `cache hit for ${conceptKey}: ${picks.data.length} chosen article(s), 0 fetches`
        };
      const stored = StoredArticleCandidates.safeParse(cached.articleCandidates ?? []);
      if (stored.success && stored.data.length > 0 && urls.every((url) => stored.data.some((page) => page.url === url)))
        return {
          data: { ...blank, fromCache: true, candidates: stored.data },
          message: `cache hit for ${conceptKey}: ${stored.data.length} vetted page(s) awaiting judgement, 0 fetches`
        };
    }
    const vetted = await vetArticleUrls(urls, fetch);
    await context.runMutation(internal.finder.cache.saveArticleCandidates, {
      conceptKey,
      topic: concept.topic,
      conceptName: concept.conceptName,
      conceptId: concept.conceptId,
      articleCandidates: vetted.candidates
    });
    return {
      data: { ...blank, candidates: vetted.candidates, rejected: vetted.rejected },
      message: `${vetted.candidates.length} of ${urls.length} page(s) answered and parsed, ${vetted.rejected.length} were dropped`
    };
  }
});
