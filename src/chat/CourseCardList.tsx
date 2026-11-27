import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Link } from '@farm.js/core/client';

import { CourseCard } from './CourseCard';
import { CourseCardSkeleton } from './CourseCardSkeleton';

import type { CourseCardFilter, CourseCardView } from '../../convex/lib/types';

interface CourseCardListProps {
  filter: CourseCardFilter;
}

const EMPTY_LINES: Record<CourseCardFilter, string> = {
  all: 'No courses yet.',
  building: 'Nothing is being built right now.',
  ready: 'No finished courses yet.'
};

export const CourseCardList = ({ filter }: CourseCardListProps) => {
  const cards = useQuery(anyApi.courseCards.mine, { filter }) as CourseCardView[] | undefined;
  if (cards === undefined) {
    return (
      <div className="ccard-list">
        <CourseCardSkeleton />
        <CourseCardSkeleton />
      </div>
    );
  }
  if (cards.length === 0) {
    return (
      <p className="chat-note">
        {EMPTY_LINES[filter]} Ask for one here, or <Link href="/courses">browse the catalog</Link>.
      </p>
    );
  }
  return (
    <div className="ccard-list">
      {cards.map((card) => (
        <CourseCard key={card.key} card={card} />
      ))}
    </div>
  );
};
