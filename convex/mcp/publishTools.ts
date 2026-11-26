import { z } from 'zod';

import { internal } from '../_generated/api';
import { buildDefaultCourseBrand } from '../lib/brand';
import { Brand } from '../lib/courseSchema';
import { readMappedState, UNKNOWN_REQUEST } from './engineState';
import { defineAgentTool } from './server';
import { publishCourseInput, submitChallengesInput } from './validators';

import type { ConceptMap } from '../lib/conceptMapSchema';
import type { Challenge } from '../lib/courseSchema';
import type { CourseModuleView } from '../lib/types';
import type { AgentTool } from './types';

function readCourseURL(slug: string): string {
  const siteURL = process.env.SITE_URL ?? '';
  return siteURL.length > 0 ? `${siteURL.replace(/\/+$/, '')}/g/${slug}` : `/g/${slug}`;
}

function listChallengeProblems(challenges: Challenge[], map: ConceptMap): string[] {
  const knownConceptIds = new Set(map.concepts.map((concept) => concept.id));
  return challenges.flatMap((challenge) => {
    if (challenge.conceptId === undefined) return [`challenge ${challenge.id}: has no conceptId`];
    if (!knownConceptIds.has(challenge.conceptId))
      return [`challenge ${challenge.id}: conceptId ${challenge.conceptId} is not in the concept map`];
    if (challenge.answer >= challenge.options.length)
      return [`challenge ${challenge.id}: answer ${challenge.answer} is past the last option`];
    return [];
  });
}

function describePending(pending: CourseModuleView[]): string {
  return pending.map((courseModule) => `  ${courseModule.n}. ${courseModule.id} is ${courseModule.status}`).join('\n');
}

const submitChallenges = defineAgentTool({
  name: 'submit_challenges',
  title: 'Submit the course challenges',
  description:
    'Send the course-wide practice questions. Each one tags a concept from the map. Optional, and it can be called any time before publish_course.',
  inputSchema: submitChallengesInput,
  run: async ({ requestId, challenges }, context) => {
    const loaded = await readMappedState(context, requestId);
    if (loaded.kind === 'failed') return { status: 'failed', message: loaded.message };
    const problems = listChallengeProblems(challenges, loaded.map);
    if (problems.length > 0)
      return {
        status: 'failed',
        message: `${problems.length} challenge problem(s). Nothing was stored.\n${problems.map((problem) => `- ${problem}`).join('\n')}`
      };
    const saved = await context.actionContext.runMutation(internal.coursePublish.saveChallenges, {
      ownerId: context.userId,
      requestId,
      challenges
    });
    if (saved.status === 'unknownRequest') return { status: 'failed', message: UNKNOWN_REQUEST };
    if (saved.status === 'noCourse')
      return { status: 'failed', message: 'This request has no course yet. Call submit_concept_map first.' };
    return { status: 'ok', text: `Stored ${saved.challengeCount} challenges for this course.` };
  }
});

const publishCourse = defineAgentTool({
  name: 'publish_course',
  title: 'Publish the course',
  description:
    'Publish once every module is ready. Give the title, tagline and summary. Returns the URL the person opens.',
  inputSchema: publishCourseInput,
  run: async ({ requestId, meta }, context) => {
    const loaded = await readMappedState(context, requestId);
    if (loaded.kind === 'failed') return { status: 'failed', message: loaded.message };
    const parsedBrand = meta.brand === undefined ? null : Brand.safeParse(meta.brand);
    if (parsedBrand !== null && !parsedBrand.success)
      return {
        status: 'failed',
        message: `The brand does not match the Brand schema. Nothing was published. Leave it out for a monochrome default.\n\n${z.prettifyError(parsedBrand.error)}`
      };
    const published = await context.actionContext.runMutation(internal.coursePublish.publishCourse, {
      ownerId: context.userId,
      requestId,
      title: meta.title,
      tagline: meta.tagline,
      summary: meta.summary,
      brand: parsedBrand === null ? buildDefaultCourseBrand(meta.title) : parsedBrand.data
    });
    if (published.status === 'unknownRequest') return { status: 'failed', message: UNKNOWN_REQUEST };
    if (published.status === 'noCourse')
      return { status: 'failed', message: 'This request has no course yet. Call submit_concept_map first.' };
    if (published.status === 'modulesPending')
      return {
        status: 'failed',
        message: [
          'Every module must be ready before the course publishes. Nothing was published.',
          describePending(published.pending),
          'Call get_module_brief for each one, then submit_module.'
        ].join('\n')
      };
    return {
      status: 'ok',
      text: [
        `Published "${meta.title}".`,
        `URL: ${readCourseURL(published.slug)}`,
        `${published.moduleCount} modules, ${published.unverifiedCount} unverified.`
      ].join('\n')
    };
  }
});

export const PUBLISH_TOOLS: readonly AgentTool[] = [submitChallenges, publishCourse];
