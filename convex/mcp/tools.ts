import { internal } from '../_generated/api';
import { normalizeTopic, readGoalProblem, readTopicProblem } from '../lib/courseRequests';
import { describeCourseRequest, summarizeCourseRequest } from './format';
import { defineAgentTool } from './server';
import { courseStatusInput, listCourseRequestsInput, startCourseInput } from './validators';

import type { AgentTool } from './types';

const startCourse = defineAgentTool({
  name: 'start_course',
  title: 'Start a Deeply course',
  description:
    'Record a request for a new course and get the first step back. Call this once per topic, before any research.',
  inputSchema: startCourseInput,
  run: async ({ topic, goal }, { actionContext, userId }) => {
    const normalizedTopic = normalizeTopic(topic);
    const topicProblem = readTopicProblem(normalizedTopic);
    if (topicProblem) return { status: 'failed', message: topicProblem };
    const normalizedGoal = goal?.trim() ?? '';
    const goalProblem = readGoalProblem(normalizedGoal);
    if (goalProblem) return { status: 'failed', message: goalProblem };

    const requestId = await actionContext.runMutation(internal.courseRequests.createForOwner, {
      ownerId: userId,
      topic: normalizedTopic,
      ...(normalizedGoal ? { goal: normalizedGoal } : {}),
      origin: 'claude'
    });
    const request = await actionContext.runQuery(internal.courseRequests.getForOwner, { ownerId: userId, requestId });
    if (!request) {
      return { status: 'failed', message: 'Could not read the request back. Call list_course_requests to check it.' };
    }
    return { status: 'ok', text: `Course request created.\n\n${describeCourseRequest(request)}` };
  }
});

const courseStatus = defineAgentTool({
  name: 'course_status',
  title: 'Read a course request',
  description: 'Read where one course request stands and what the next step is.',
  inputSchema: courseStatusInput,
  run: async ({ id }, { actionContext, userId }) => {
    const request = await actionContext.runQuery(internal.courseRequests.getForOwner, {
      ownerId: userId,
      requestId: id
    });
    if (!request) {
      return { status: 'failed', message: 'No course request with that id. Call list_course_requests to see yours.' };
    }
    return { status: 'ok', text: describeCourseRequest(request) };
  }
});

const listCourseRequests = defineAgentTool({
  name: 'list_course_requests',
  title: 'List course requests',
  description: 'List the most recent course requests for this key, newest first.',
  inputSchema: listCourseRequestsInput,
  run: async (_input, { actionContext, userId }) => {
    const requests = await actionContext.runQuery(internal.courseRequests.listForOwner, { ownerId: userId });
    if (requests.length === 0) {
      return { status: 'ok', text: 'No course requests yet. Call start_course to make one.' };
    }
    return { status: 'ok', text: requests.map(summarizeCourseRequest).join('\n') };
  }
});

export const AGENT_TOOLS: readonly AgentTool[] = [startCourse, courseStatus, listCourseRequests];
