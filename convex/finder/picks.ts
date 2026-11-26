import { v } from 'convex/values';

import { internalMutation, internalQuery } from '../_generated/server';
import { toArticleBlocks, toVideoBlocks } from './blocks';
import { findConceptRow, isFresh } from './cache';
import { buildConceptKey } from './concepts';
import { keepBest, scoreArticle, scoreVideo } from './scoring';
import { ReadConceptMediaRequest, ScoreArticlesRequest, ScoreVideosRequest } from './validators';
import { StoredArticleCandidates, StoredVideoCandidates } from './validators';
import type { RejectedTarget, ScoredArticle, ScoredVideo } from './types';

export const scoreVideos = internalMutation({
  args: { request: v.any() },
  handler: async (context, { request }) => {
    const parsed = ScoreVideosRequest.safeParse(request);
    if (!parsed.success)
      return { data: null, message: `the request does not match the schema: ${parsed.error.message}` };
    const { conceptKey, judgements, keep } = parsed.data;
    const row = await findConceptRow(context.db, conceptKey);
    if (row === null) return { data: null, message: `nothing is cached for ${conceptKey}; find candidates first` };
    const stored = StoredVideoCandidates.safeParse(row.videoCandidates ?? []);
    if (!stored.success) return { data: null, message: `the cached candidates for ${conceptKey} are unreadable` };
    const now = Date.now();
    const scored: ScoredVideo[] = [];
    const unknown: RejectedTarget[] = [];
    for (const judgement of judgements) {
      const candidate = stored.data.find((entry) => entry.youtubeId === judgement.youtubeId);
      if (candidate === undefined) {
        unknown.push({ target: judgement.youtubeId, reason: 'it is not one of the cached candidates' });
        continue;
      }
      scored.push(scoreVideo({ candidate, judgement, conceptId: row.conceptId, now }));
    }
    const picks = keepBest(scored, keep);
    const { blocks, invalid } = toVideoBlocks(picks);
    await context.db.patch(row._id, { videos: picks });
    return {
      data: { conceptKey, picks, blocks, unknown, invalid, scored },
      message: `kept ${picks.length} of ${scored.length} judged video(s) for ${conceptKey}`
    };
  }
});

export const scoreArticles = internalMutation({
  args: { request: v.any() },
  handler: async (context, { request }) => {
    const parsed = ScoreArticlesRequest.safeParse(request);
    if (!parsed.success)
      return { data: null, message: `the request does not match the schema: ${parsed.error.message}` };
    const { conceptKey, judgements, keep } = parsed.data;
    const row = await findConceptRow(context.db, conceptKey);
    if (row === null) return { data: null, message: `nothing is cached for ${conceptKey}; vet articles first` };
    const stored = StoredArticleCandidates.safeParse(row.articleCandidates ?? []);
    if (!stored.success) return { data: null, message: `the vetted pages for ${conceptKey} are unreadable` };
    const now = Date.now();
    const scored: ScoredArticle[] = [];
    const unknown: RejectedTarget[] = [];
    for (const judgement of judgements) {
      const candidate = stored.data.find((entry) => entry.url === judgement.url);
      if (candidate === undefined) {
        unknown.push({ target: judgement.url, reason: 'it is not one of the vetted pages' });
        continue;
      }
      scored.push(scoreArticle({ candidate, judgement, conceptId: row.conceptId, now }));
    }
    const picks = keepBest(scored, keep);
    const { blocks, invalid } = toArticleBlocks(picks);
    await context.db.patch(row._id, { articles: picks });
    return {
      data: { conceptKey, picks, blocks, unknown, invalid, scored },
      message: `kept ${picks.length} of ${scored.length} judged page(s) for ${conceptKey}`
    };
  }
});

export const readConceptMedia = internalQuery({
  args: { request: v.any() },
  handler: async (context, { request }) => {
    const parsed = ReadConceptMediaRequest.safeParse(request);
    if (!parsed.success)
      return { data: null, message: `the request does not match the schema: ${parsed.error.message}` };
    const conceptKey = buildConceptKey(parsed.data);
    const row = await findConceptRow(context.db, conceptKey);
    if (row === null) return { data: null, message: `nothing is cached for ${conceptKey}` };
    const fresh = isFresh(row, Date.now());
    return {
      data: {
        conceptKey,
        fresh,
        fetchedAt: row.fetchedAt,
        quotaUnits: row.quotaUnits,
        videos: row.videos ?? [],
        articles: row.articles ?? []
      },
      message: `${conceptKey} was fetched ${new Date(row.fetchedAt).toISOString()} and is ${fresh ? 'fresh' : 'stale'}`
    };
  }
});
