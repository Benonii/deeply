export interface ConceptRequest {
  topic: string;
  conceptId: string;
  conceptName: string;
  definition: string;
}

export interface VideoChapter {
  startSec: number;
  title: string;
}

export interface ChannelRecord {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export interface VideoCandidate {
  youtubeId: string;
  title: string;
  channel: string;
  channelId: string;
  description: string;
  chapters: VideoChapter[];
  durationSec: number;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  topComments: string[];
  channelRecord?: ChannelRecord;
}

export interface VideoJudgement {
  youtubeId: string;
  relevance: number;
  startSec: number;
  endSec: number;
  praiseCount: number;
  warningCount: number;
  neutralCount: number;
}

export interface VideoScoreParts {
  relevance: number;
  comments: number;
  likesPerView: number;
  viewsPerMonth: number;
  channel: number;
  freshness: number;
}

export interface ScoredVideo {
  type: 'video';
  youtubeId: string;
  title: string;
  channel: string;
  startSec: number;
  endSec: number;
  conceptId: string;
  score: number;
  parts: VideoScoreParts;
}

export interface ArticleCandidate {
  url: string;
  title: string;
  site: string;
  publishedAt?: string;
  wordCount: number;
  codeBlockCount: number;
  minutes: number;
}

export interface ArticleJudgement {
  url: string;
  relevance: number;
  tier: number;
}

export interface ArticleScoreParts {
  relevance: number;
  tier: number;
  depth: number;
  freshness: number;
}

export interface ScoredArticle {
  type: 'article';
  url: string;
  title: string;
  site: string;
  minutes: number;
  conceptId: string;
  score: number;
  parts: ArticleScoreParts;
}

export interface RejectedTarget {
  target: string;
  reason: string;
}

export interface QuotaSpend {
  search: number;
  videos: number;
  commentThreads: number;
  channels: number;
  units: number;
}

export interface VideoSearchOptions {
  concept: ConceptRequest;
  fetchResponse: typeof fetch;
  youtubeApiKey: string;
  searchQueries?: string[];
  proposedVideoIds?: string[];
  relevanceLanguage?: string;
  publishedAfter?: string;
  now?: number;
}

export interface VideoSearchResult {
  candidates: VideoCandidate[];
  rejected: RejectedTarget[];
  quota: QuotaSpend;
  searchedQueries: string[];
  error?: string;
}

export interface FinderAnswer<Data> {
  data: Data | null;
  message: string;
}

export interface VideoCandidatesData {
  conceptKey: string;
  fromCache: boolean;
  picks: ScoredVideo[] | null;
  candidates: VideoCandidate[];
  rejected: RejectedTarget[];
  quota: QuotaSpend;
  searchedQueries: string[];
  rubric: string;
  channelNote: string;
}

export interface ArticleCandidatesData {
  conceptKey: string;
  fromCache: boolean;
  picks: ScoredArticle[] | null;
  candidates: ArticleCandidate[];
  rejected: RejectedTarget[];
  rubric: string;
}
