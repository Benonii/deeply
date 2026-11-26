import { tool } from 'ai';

import { internal } from '../_generated/api';
import { normalizeTopic, readGoalProblem, readTopicProblem } from '../lib/courseRequests';
import { createCourseRequestInput, showCoursesInput } from './validators';

import type { CreateCourseRequestOutcome, ShowCoursesOutcome } from '../lib/types';
import type { ChatToolContext } from './types';

export function buildChatTools({ actionContext, userId }: ChatToolContext) {
  return {
    create_course_request: tool({
      description:
        'Record a request for a new course on a topic. The card it returns shows the person how their own Claude picks the request up.',
      inputSchema: createCourseRequestInput,
      execute: async ({ topic, goal }): Promise<CreateCourseRequestOutcome> => {
        const normalizedTopic = normalizeTopic(topic);
        const topicProblem = readTopicProblem(normalizedTopic);
        if (topicProblem) return { kind: 'rejected', problem: topicProblem };

        const normalizedGoal = goal?.trim() ?? '';
        const goalProblem = readGoalProblem(normalizedGoal);
        if (goalProblem) return { kind: 'rejected', problem: goalProblem };

        const requestId = await actionContext.runMutation(internal.courseRequests.createForOwner, {
          ownerId: userId,
          topic: normalizedTopic,
          ...(normalizedGoal ? { goal: normalizedGoal } : {}),
          origin: 'chat'
        });
        return { kind: 'created', requestId, topic: normalizedTopic };
      }
    }),
    show_courses: tool({
      description:
        'Show the person their courses and live builds as cards. The cards stay up to date on their own, so do not describe them.',
      inputSchema: showCoursesInput,
      execute: async ({ filter }): Promise<ShowCoursesOutcome> => {
        const count = await actionContext.runQuery(internal.courseCards.countForOwner, { ownerId: userId, filter });
        return { kind: 'listed', filter, count };
      }
    })
  };
}
