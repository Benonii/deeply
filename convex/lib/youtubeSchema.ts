import { z } from 'zod';

const CountString = z.string().optional();

export const YouTubeVideoFacts = z.object({
  id: z.string(),
  status: z
    .object({
      privacyStatus: z.string().optional(),
      embeddable: z.boolean().optional(),
      uploadStatus: z.string().optional()
    })
    .optional(),
  contentDetails: z.object({ duration: z.string().optional() }).optional(),
  snippet: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      liveBroadcastContent: z.string().optional(),
      channelId: z.string().optional(),
      channelTitle: z.string().optional(),
      publishedAt: z.string().optional()
    })
    .optional(),
  statistics: z.object({ viewCount: CountString, likeCount: CountString, commentCount: CountString }).optional()
});
export type YouTubeVideoFacts = z.infer<typeof YouTubeVideoFacts>;

export const YouTubeVideoListResponse = z.object({ items: z.array(YouTubeVideoFacts).optional() });
export type YouTubeVideoListResponse = z.infer<typeof YouTubeVideoListResponse>;

export const YouTubeSearchResponse = z.object({
  items: z.array(z.object({ id: z.object({ videoId: z.string().optional() }).optional() })).optional()
});
export type YouTubeSearchResponse = z.infer<typeof YouTubeSearchResponse>;

export const YouTubeCommentThreadsResponse = z.object({
  items: z
    .array(
      z.object({
        snippet: z
          .object({
            topLevelComment: z
              .object({
                snippet: z.object({ textOriginal: z.string().optional(), likeCount: z.number().optional() }).optional()
              })
              .optional()
          })
          .optional()
      })
    )
    .optional()
});
export type YouTubeCommentThreadsResponse = z.infer<typeof YouTubeCommentThreadsResponse>;

export const YouTubeChannelFacts = z.object({
  id: z.string(),
  statistics: z
    .object({ subscriberCount: CountString, viewCount: CountString, videoCount: CountString })
    .optional()
});
export type YouTubeChannelFacts = z.infer<typeof YouTubeChannelFacts>;

export const YouTubeChannelListResponse = z.object({ items: z.array(YouTubeChannelFacts).optional() });
export type YouTubeChannelListResponse = z.infer<typeof YouTubeChannelListResponse>;
