import { CourseCardList } from './CourseCardList';
import { CourseCardSkeleton } from './CourseCardSkeleton';

import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import type { ShowCoursesOutcome } from '../../convex/lib/types';

export const CoursesToolCard = ({ result, status }: ToolCallMessagePartProps<unknown, ShowCoursesOutcome>) => {
  if (status.type === 'incomplete') return <p className="chat-note">Your courses could not be read.</p>;
  if (!result) return <CourseCardSkeleton />;
  return <CourseCardList filter={result.filter} />;
};
