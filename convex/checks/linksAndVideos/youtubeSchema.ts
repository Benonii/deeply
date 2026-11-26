import { z } from 'zod';

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
      liveBroadcastContent: z.string().optional()
    })
    .optional()
});
export type YouTubeVideoFacts = z.infer<typeof YouTubeVideoFacts>;

export const YouTubeVideoListResponse = z.object({ items: z.array(YouTubeVideoFacts).optional() });
export type YouTubeVideoListResponse = z.infer<typeof YouTubeVideoListResponse>;
