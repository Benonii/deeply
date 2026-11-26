import { ArticleBlock, VideoBlock } from '../lib/courseSchema';
import type { z } from 'zod';
import type { RejectedTarget, ScoredArticle, ScoredVideo } from './types';

function parseBlocks<Parsed>(
  drafts: unknown[],
  schema: z.ZodType<Parsed>
): { blocks: Parsed[]; invalid: RejectedTarget[] } {
  const blocks: Parsed[] = [];
  const invalid: RejectedTarget[] = [];
  drafts.forEach((draft, index) => {
    const parsed = schema.safeParse(draft);
    if (parsed.success) blocks.push(parsed.data);
    else invalid.push({ target: `pick ${index + 1}`, reason: parsed.error.message });
  });
  return { blocks, invalid };
}

export function toVideoBlocks(picks: ScoredVideo[]) {
  return parseBlocks(
    picks.map((pick) => ({
      type: pick.type,
      youtubeId: pick.youtubeId,
      title: pick.title,
      channel: pick.channel,
      startSec: pick.startSec,
      endSec: pick.endSec,
      conceptId: pick.conceptId
    })),
    VideoBlock
  );
}

export function toArticleBlocks(picks: ScoredArticle[]) {
  return parseBlocks(
    picks.map((pick) => ({
      type: pick.type,
      url: pick.url,
      title: pick.title,
      site: pick.site,
      minutes: pick.minutes,
      conceptId: pick.conceptId
    })),
    ArticleBlock
  );
}
