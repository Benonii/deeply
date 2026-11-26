import { z } from 'zod';

import { Source } from '../lib/conceptMapSchema';
import { Challenge } from '../lib/courseSchema';
import { GOAL_MAX_LENGTH, TOPIC_MAX_LENGTH, TOPIC_MIN_LENGTH } from '../lib/courseRequests';

const requestId = z.string().min(1).describe('The course request id that start_course returned.');

const moduleId = z.string().min(1).describe('The module id from the concept map, for example "iterator-protocol".');

const jsonObject = z.record(z.string(), z.unknown());

export const TITLE_MAX_LENGTH = 80;
export const TAGLINE_MAX_LENGTH = 120;
export const SUMMARY_MAX_LENGTH = 600;

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

export const submitResearchInput = z.object({
  requestId,
  sources: z
    .array(Source)
    .min(1)
    .describe('Every page you read and kept, each with the verbatim quotes you plan to teach from.')
});

export const submitConceptMapInput = z.object({
  requestId,
  map: jsonObject.describe('The whole concept map: goal, concepts, edges, modules and sources.')
});

export const getModuleBriefInput = z.object({ requestId, moduleId });

export const submitModuleInput = z.object({
  requestId,
  moduleId,
  pack: jsonObject.describe('The written module, matching the ModulePack schema the brief gives you.'),
  submission: jsonObject.describe('Your results for every check the brief lists, in one CheckSubmission object.'),
  attempt: z.number().int().min(1).optional().describe('Which rewrite this is. The server keeps its own count.')
});

export const submitChallengesInput = z.object({
  requestId,
  challenges: z.array(Challenge).min(1).describe('Course-wide practice questions, each tagged with one conceptId.')
});

export const publishCourseInput = z.object({
  requestId,
  meta: z.object({
    title: z.string().min(1).max(TITLE_MAX_LENGTH).describe('For example "Python generators, Deeply".'),
    tagline: z.string().min(1).max(TAGLINE_MAX_LENGTH).describe('One line under the title.'),
    summary: z.string().min(1).max(SUMMARY_MAX_LENGTH).describe('Two or three sentences on what the course covers.'),
    brand: jsonObject.optional().describe('A Brand object. Leave it out for a quiet monochrome default.')
  })
});
