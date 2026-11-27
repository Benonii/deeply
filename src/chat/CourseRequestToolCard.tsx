import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

import { CourseCard } from './CourseCard';
import { CourseCardSkeleton } from './CourseCardSkeleton';

import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import type { CourseCardView, CreateCourseRequestOutcome } from '../../convex/lib/types';

interface LiveRequestCardProps {
  requestId: string;
}

const LiveRequestCard = ({ requestId }: LiveRequestCardProps) => {
  const card = useQuery(anyApi.courseCards.myRequest, { requestId }) as CourseCardView | null | undefined;
  if (card === undefined) return <CourseCardSkeleton />;
  if (card === null) return <p className="chat-note">That request is no longer there.</p>;
  return <CourseCard card={card} />;
};

export const CourseRequestToolCard = ({
  result,
  status
}: ToolCallMessagePartProps<unknown, CreateCourseRequestOutcome>) => {
  if (status.type === 'incomplete') return <p className="chat-note">That request could not be recorded.</p>;
  if (!result) return <CourseCardSkeleton />;
  if (result.kind === 'rejected') return <p className="chat-note">{result.problem}</p>;
  return <LiveRequestCard requestId={result.requestId} />;
};
