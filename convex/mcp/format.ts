import { readStageInstruction } from '../lib/courseRequests';

import type { CourseRequestView, EngineStateView } from '../lib/types';

const MODULE_ID_COLUMN = 24;

function listRequestLines(request: CourseRequestView): string[] {
  return [
    `Request id: ${request.id}`,
    `Topic: ${request.topic}`,
    ...(request.goal ? [`Goal: ${request.goal}`] : []),
    `Status: ${request.status}`,
    `Steps done: ${request.stepsDone.length > 0 ? request.stepsDone.join(', ') : 'none yet'}`,
    `Started by: ${request.origin}`,
    `Started at: ${new Date(request.createdAt).toISOString()}`,
    `Updated at: ${new Date(request.updatedAt).toISOString()}`,
    ...(request.courseId ? [`Course id: ${request.courseId}`] : []),
    ...(request.error ? [`Error: ${request.error}`] : [])
  ];
}

export function describeCourseRequest(request: CourseRequestView): string {
  return [...listRequestLines(request), '', `Next: ${readStageInstruction(request.status)}`].join('\n');
}

export function describeEngineState(state: EngineStateView): string {
  const { request, course, modules } = state;
  return [
    ...listRequestLines(request),
    `Sources stored: ${state.sourceCount}`,
    ...(course
      ? [
          `Course: ${course.slug} (${course.status}, ${course.visibility}, ${course.challengeCount} challenges)`,
          'Modules:',
          ...modules.map(
            (courseModule) =>
              `  ${courseModule.n}. ${courseModule.id.padEnd(MODULE_ID_COLUMN)} ${courseModule.status.padEnd(8)} ${courseModule.attempts} attempt(s)${courseModule.isUnverified ? ', unverified' : ''}`
          )
        ]
      : []),
    '',
    `Next: ${readStageInstruction(request.status)}`
  ].join('\n');
}

export function summarizeCourseRequest(request: CourseRequestView): string {
  return `${request.id}  ${request.status.padEnd(11)}  ${request.topic}`;
}
