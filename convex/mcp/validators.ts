import { z } from 'zod';

import { GOAL_MAX_LENGTH, TOPIC_MAX_LENGTH, TOPIC_MIN_LENGTH } from '../lib/courseRequests';

export const startCourseInput = z.object({
  topic: z
    .string()
    .min(TOPIC_MIN_LENGTH)
    .max(TOPIC_MAX_LENGTH)
    .describe('What the course teaches, as a short phrase. For example "Rust ownership" or "how DNS resolves a name".'),
  goal: z
    .string()
    .max(GOAL_MAX_LENGTH)
    .optional()
    .describe('What the learner wants to be able to do at the end. Pass it when the person said so.')
});

export const courseStatusInput = z.object({
  id: z.string().min(1).describe('The course request id that start_course returned.')
});

export const listCourseRequestsInput = z.object({});
