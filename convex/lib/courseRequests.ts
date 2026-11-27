import { v } from 'convex/values';

import type { CourseRequestStage, CourseRequestStatus } from './types';

export const courseRequestStage = v.union(
  v.literal('queued'),
  v.literal('researching'),
  v.literal('mapping'),
  v.literal('writing'),
  v.literal('checking'),
  v.literal('published')
);

export const courseRequestStatus = v.union(courseRequestStage, v.literal('failed'));

export const courseRequestOrigin = v.union(v.literal('claude'), v.literal('chat'));

export const COURSE_REQUEST_STAGES = courseRequestStage.members.map((member) => member.value);

export const TOPIC_MIN_LENGTH = 3;
export const TOPIC_MAX_LENGTH = 200;
export const GOAL_MAX_LENGTH = 500;

const STAGE_INSTRUCTIONS: Record<CourseRequestStage, string> = {
  queued:
    'Research the topic. Read the official documentation first, then respected write-ups, and keep a verbatim quote and a URL for every claim you plan to teach. Send them with submit_research.',
  researching:
    'The research is in. Build the concept map next: one definition per concept, prerequisite edges, and a module plan that teaches at most three new concepts per module. Send it with submit_concept_map.',
  mapping:
    'The concept map is in. Write the modules next, one at a time, in the planned order. Call get_module_brief for the first module, then submit_module with the pack and its check submission.',
  writing:
    'Some modules are still missing. Call get_module_brief for the next module that is not ready, then submit_module with the pack and its check submission.',
  checking: 'Every module is ready. Publish the course with publish_course.',
  published: 'This course is published. There is nothing left to do.'
};

const FAILED_INSTRUCTION = 'This request failed. Read the error, then start a new request.';

export function readStageInstruction(status: CourseRequestStatus): string {
  return status === 'failed' ? FAILED_INSTRUCTION : STAGE_INSTRUCTIONS[status];
}

export function listStagesDone(stepsDone: CourseRequestStage[], reached: CourseRequestStage): CourseRequestStage[] {
  const done = new Set([...stepsDone, reached]);
  return COURSE_REQUEST_STAGES.filter((stage) => done.has(stage));
}

export function normalizeTopic(topic: string): string {
  return topic.trim().replace(/\s+/g, ' ');
}

export function readTopicProblem(normalizedTopic: string): string | null {
  if (normalizedTopic.length < TOPIC_MIN_LENGTH) return `The topic needs at least ${TOPIC_MIN_LENGTH} characters.`;
  if (normalizedTopic.length > TOPIC_MAX_LENGTH) return `The topic must be ${TOPIC_MAX_LENGTH} characters or fewer.`;
  return null;
}

export function readGoalProblem(normalizedGoal: string): string | null {
  return normalizedGoal.length > GOAL_MAX_LENGTH ? `The goal must be ${GOAL_MAX_LENGTH} characters or fewer.` : null;
}
