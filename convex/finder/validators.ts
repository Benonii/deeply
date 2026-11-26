import { z } from 'zod';

import { ConceptID } from '../lib/conceptMapSchema';

export const YouTubeID = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

export const ConceptRequestInput = z.object({
  topic: z.string().min(1).describe('the course topic, e.g. "Python iterators"'),
  conceptId: ConceptID,
  conceptName: z.string().min(1),
  definition: z.string().min(1).describe('one line, used only to steer the agent judgement')
});
export type ConceptRequestInput = z.infer<typeof ConceptRequestInput>;

export const FindVideoCandidatesRequest = z.object({
  concept: ConceptRequestInput,
  searchQueries: z
    .array(z.string().min(1))
    .max(2)
    .optional()
    .describe('an empty array vets proposals without a search'),
  proposedVideoIds: z.array(YouTubeID).max(20).optional().describe('ids the agent found by browsing'),
  relevanceLanguage: z.string().min(2).max(8).default('en'),
  publishedAfter: z.string().optional().describe('RFC 3339, drops videos made before the version that matters'),
  refresh: z.boolean().default(false)
});
export type FindVideoCandidatesRequest = z.infer<typeof FindVideoCandidatesRequest>;

export const VideoJudgementInput = z.object({
  youtubeId: YouTubeID,
  relevance: z.number().min(0).max(1),
  startSec: z.number().int().min(0),
  endSec: z.number().int().min(0),
  praiseCount: z.number().int().min(0).default(0),
  warningCount: z.number().int().min(0).default(0),
  neutralCount: z.number().int().min(0).default(0)
});

export const ScoreVideosRequest = z.object({
  conceptKey: z.string().min(1),
  judgements: z.array(VideoJudgementInput).min(1),
  keep: z.number().int().min(1).max(2).default(2)
});
export type ScoreVideosRequest = z.infer<typeof ScoreVideosRequest>;

export const VetArticlesRequest = z.object({
  concept: ConceptRequestInput,
  urls: z.array(z.string().min(1)).min(1).max(12),
  refresh: z.boolean().default(false)
});
export type VetArticlesRequest = z.infer<typeof VetArticlesRequest>;

export const ArticleJudgementInput = z.object({
  url: z.string().min(1),
  relevance: z.number().min(0).max(1),
  tier: z.number().int().min(1).max(4)
});

export const ScoreArticlesRequest = z.object({
  conceptKey: z.string().min(1),
  judgements: z.array(ArticleJudgementInput).min(1),
  keep: z.number().int().min(1).max(2).default(2)
});
export type ScoreArticlesRequest = z.infer<typeof ScoreArticlesRequest>;

export const ReadConceptMediaRequest = z.object({ topic: z.string().min(1), conceptName: z.string().min(1) });

export const StoredVideoCandidates = z.array(
  z.object({
    youtubeId: YouTubeID,
    title: z.string(),
    channel: z.string(),
    channelId: z.string(),
    description: z.string(),
    chapters: z.array(z.object({ startSec: z.number(), title: z.string() })),
    durationSec: z.number(),
    publishedAt: z.string(),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    topComments: z.array(z.string()),
    channelRecord: z.object({ subscriberCount: z.number(), viewCount: z.number(), videoCount: z.number() }).optional()
  })
);

export const StoredArticleCandidates = z.array(
  z.object({
    url: z.string(),
    title: z.string(),
    site: z.string(),
    publishedAt: z.string().optional(),
    wordCount: z.number(),
    codeBlockCount: z.number(),
    minutes: z.number()
  })
);

export const StoredVideoPicks = z.array(
  z.object({
    type: z.literal('video'),
    youtubeId: YouTubeID,
    title: z.string(),
    channel: z.string(),
    startSec: z.number(),
    endSec: z.number(),
    conceptId: ConceptID,
    score: z.number(),
    parts: z.object({
      relevance: z.number(),
      comments: z.number(),
      likesPerView: z.number(),
      viewsPerMonth: z.number(),
      channel: z.number(),
      freshness: z.number()
    })
  })
);

export const StoredArticlePicks = z.array(
  z.object({
    type: z.literal('article'),
    url: z.string(),
    title: z.string(),
    site: z.string(),
    minutes: z.number(),
    conceptId: ConceptID,
    score: z.number(),
    parts: z.object({
      relevance: z.number(),
      tier: z.number(),
      depth: z.number(),
      freshness: z.number()
    })
  })
);
