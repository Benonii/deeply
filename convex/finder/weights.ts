export const videoWeights = {
  relevance: 0.4,
  comments: 0.2,
  likesPerView: 0.15,
  viewsPerMonth: 0.1,
  channel: 0.1,
  freshness: 0.05
};

export const articleWeights = {
  relevance: 0.4,
  tier: 0.3,
  depth: 0.25,
  freshness: 0.05
};

export const finderThresholds = {
  minDurationSec: 180,
  maxDurationSec: 2400,
  shortMaxSeconds: 60,
  chaptersNeededBeyondMaxDuration: 3,
  searchResultsPerQuery: 25,
  maxSearchQueries: 2,
  maxVideoIdsPerRequest: 50,
  candidateLimit: 10,
  topCommentCount: 20,
  commentCharLimit: 240,
  descriptionCharLimit: 2000,
  pickLimit: 2,
  cacheDays: 30,
  requestTimeoutMs: 15_000,
  excellentLikesPerView: 0.05,
  monthlyViewsCeiling: 100_000,
  subscriberCeiling: 1_000_000,
  viewsPerVideoCeiling: 100_000,
  staleAfterYears: 6,
  deepWordCount: 1800,
  deepCodeBlockCount: 6,
  articleWordsPerMinute: 220,
  maxArticleBytes: 1_500_000,
  bestTier: 1,
  worstTier: 4
};

export const quotaUnitsPerCall = {
  search: 100,
  videos: 1,
  commentThreads: 1,
  channels: 1
};
