import { createContext, useCallback, useContext, useMemo } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

import { buildTermIndex, listCourseConcepts } from './lessonIndex';
import { showToast } from './toast';

import type { ModulePack } from '../../convex/lib/courseSchema';
import type { ConceptActivityRow, CourseLearningState, MasteryRow } from '../../convex/lib/types';
import type { GradeResult } from '../../convex/player/types';
import type { LessonActivity, LessonState } from '../types';

interface LessonModule {
  id: string;
  n: number;
  title: string;
  pack?: ModulePack;
}

interface LessonStateInput {
  courseId: string;
  basePath: string;
  moduleId: string;
  modules: LessonModule[];
  deviceId: string;
}

const noLesson: LessonState = {
  courseId: '',
  basePath: '',
  moduleId: '',
  terms: new Map(),
  concepts: [],
  masteryByConcept: new Map(),
  activityBySubject: new Map(),
  recordActivity: () => {},
  submitExplainBack: async () => ({ status: 'unsupported' })
};

export const LessonContext = createContext<LessonState>(noLesson);

export function useLesson() {
  return useContext(LessonContext);
}

export function useLessonState({ courseId, basePath, moduleId, modules, deviceId }: LessonStateInput): LessonState {
  const terms = buildTermIndex(modules);
  const concepts = listCourseConcepts(modules);
  const learning = useQuery(anyApi.mastery.listCourse, concepts.length ? { courseId, deviceId } : 'skip') as
    | CourseLearningState
    | undefined;
  const record = useMutation(anyApi.mastery.record);
  const grade = useAction(anyApi.player.explainBack.grade);
  const saved = useMemo(
    () => ({
      masteryByConcept: new Map((learning?.concepts ?? []).map((row: MasteryRow) => [row.conceptId, row])),
      activityBySubject: new Map((learning?.activity ?? []).map((row: ConceptActivityRow) => [row.subjectId, row]))
    }),
    [learning]
  );
  const recordActivity = useCallback(
    (activity: LessonActivity) => {
      record({ courseId, moduleId, deviceId, ...activity }).catch(() =>
        showToast("Couldn't save that. Check your connection.")
      );
    },
    [record, courseId, moduleId, deviceId]
  );
  const submitExplainBack = useCallback(
    async (activity: LessonActivity): Promise<GradeResult> => {
      try {
        await record({ courseId, moduleId, deviceId, ...activity });
      } catch {
        return { status: 'error', message: "Couldn't save that. Check your connection." };
      }
      try {
        return (await grade({ courseId, subjectId: activity.subjectId, deviceId })) as GradeResult;
      } catch {
        return { status: 'error', message: "Couldn't reach the marker. Try again." };
      }
    },
    [record, grade, courseId, moduleId, deviceId]
  );
  return { courseId, basePath, moduleId, terms, concepts, ...saved, recordActivity, submitExplainBack };
}
