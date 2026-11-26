import { z } from 'zod';

import { GOAL_MAX_LENGTH, TOPIC_MAX_LENGTH } from '../lib/courseRequests';

export const createCourseRequestInput = z.object({
  topic: z
    .string()
    .max(TOPIC_MAX_LENGTH * 2)
    .describe('what the course should teach, in a few words'),
  goal: z
    .string()
    .max(GOAL_MAX_LENGTH * 2)
    .optional()
    .describe('why the person wants it, in their own words, when they said')
});

export const showCoursesInput = z.object({
  filter: z
    .enum(['all', 'building', 'ready'])
    .default('all')
    .describe('all for everything, building for courses still being written, ready for ones they can open')
});

export const chatRequestBody = z.object({
  messages: z.array(z.unknown()).min(1).max(200)
});
