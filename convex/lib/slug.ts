import type { QueryCtx } from '../_generated/server';

const SLUG_MAX_LENGTH = 40;
const SLUG_STEM_LENGTH = 34;

export function slugifyTopic(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?github\.com\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, SLUG_MAX_LENGTH) || 'course'
  );
}

export async function pickFreeCourseSlug(context: QueryCtx, topic: string): Promise<string> {
  const stem = slugifyTopic(topic);
  let slug = stem;
  while (
    await context.db
      .query('courses')
      .withIndex('by_slug', (indexRange) => indexRange.eq('slug', slug))
      .first()
  ) {
    slug = `${stem.slice(0, SLUG_STEM_LENGTH)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return slug;
}
