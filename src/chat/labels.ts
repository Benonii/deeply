import { COURSE_REQUEST_STAGES } from '../../convex/lib/courseRequests';

import type { CourseCardStatus, CourseRequestStage } from '../../convex/lib/types';

const STAGE_LABELS: Record<CourseRequestStage, string> = {
  queued: 'Queued',
  researching: 'Research',
  mapping: 'Concept map',
  writing: 'Writing',
  checking: 'Checks',
  published: 'Published'
};

const STATUS_LABELS: Record<CourseCardStatus['kind'], string> = {
  building: 'Building',
  ready: 'Ready',
  failed: 'Failed'
};

export function readStageLabel(stage: CourseRequestStage): string {
  return STAGE_LABELS[stage];
}

export function readStatusLabel(status: CourseCardStatus): string {
  return status.kind === 'building' ? STAGE_LABELS[status.stage] : STATUS_LABELS[status.kind];
}

export function readStageProgress(stepsDone: CourseRequestStage[]): number {
  return stepsDone.length / COURSE_REQUEST_STAGES.length;
}

export const TOTAL_STAGES = COURSE_REQUEST_STAGES.length;
