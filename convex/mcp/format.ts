import { readStageInstruction } from '../lib/courseRequests';

import type { CourseRequestView } from '../lib/types';

export function describeCourseRequest(request: CourseRequestView): string {
  const lines = [
    `Request id: ${request.id}`,
    `Topic: ${request.topic}`,
    ...(request.goal ? [`Goal: ${request.goal}`] : []),
    `Status: ${request.status}`,
    `Steps done: ${request.stepsDone.length > 0 ? request.stepsDone.join(', ') : 'none yet'}`,
    `Started by: ${request.origin}`,
    `Started at: ${new Date(request.createdAt).toISOString()}`,
    `Updated at: ${new Date(request.updatedAt).toISOString()}`,
    ...(request.courseId ? [`Course id: ${request.courseId}`] : []),
    ...(request.error ? [`Error: ${request.error}`] : []),
    '',
    `Next: ${readStageInstruction(request.status)}`
  ];
  return lines.join('\n');
}

export function summarizeCourseRequest(request: CourseRequestView): string {
  return `${request.id}  ${request.status.padEnd(11)}  ${request.topic}`;
}
