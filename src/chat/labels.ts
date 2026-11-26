import { COURSE_REQUEST_STAGES } from '../../convex/lib/courseRequests';

import type { CourseCardStatus, CourseModuleProgress, CourseRequestStage } from '../../convex/lib/types';

const STAGE_LABELS: Record<CourseRequestStage, string> = {
  queued: 'Queued',
  researching: 'Research',
  mapping: 'Concept map',
  writing: 'Writing',
  checking: 'Checks',
  published: 'Published'
};

const STAGE_IN_PROGRESS_LABELS: Record<CourseRequestStage, string> = {
  queued: 'Queued',
  researching: 'Researching',
  mapping: 'Mapping concepts',
  writing: 'Writing',
  checking: 'Checking',
  published: 'Publishing'
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
  return status.kind === 'building' ? STAGE_IN_PROGRESS_LABELS[status.stage] : STATUS_LABELS[status.kind];
}

export function readModulesWritingProgress(
  stage: CourseRequestStage,
  modules: CourseModuleProgress | null
): CourseModuleProgress | null {
  return stage === 'writing' && modules && modules.total > 0 ? modules : null;
}

export function readStageProgress(
  stepsDone: CourseRequestStage[],
  modulesWriting: CourseModuleProgress | null
): number {
  const moduleShare = modulesWriting ? modulesWriting.ready / modulesWriting.total : 0;
  return (stepsDone.length + moduleShare) / COURSE_REQUEST_STAGES.length;
}

export const TOTAL_STAGES = COURSE_REQUEST_STAGES.length;
