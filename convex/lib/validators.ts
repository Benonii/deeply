import { v } from 'convex/values';

export const articleCheckInOutcome = v.union(v.literal('finished'), v.literal('partway'), v.literal('skip'));

const quizAnswer = v.object({ kind: v.literal('quizAnswer'), choice: v.number(), isCorrect: v.boolean() });
const articleCheckIn = v.object({ kind: v.literal('articleCheckIn'), outcome: articleCheckInOutcome });
const videoWatch = v.object({
  kind: v.literal('videoWatch'),
  watchedSec: v.number(),
  startSec: v.number(),
  endSec: v.number()
});

export const conceptActivityInput = v.union(
  quizAnswer,
  v.object({ kind: v.literal('explainBack'), text: v.string() }),
  articleCheckIn,
  videoWatch
);

export const rubricPointResult = v.object({ isMet: v.boolean(), note: v.string() });

const explainBackPending = v.object({
  kind: v.literal('explainBack'),
  text: v.string(),
  status: v.literal('pending grading')
});

const explainBackGraded = v.object({
  kind: v.literal('explainBack'),
  text: v.string(),
  status: v.literal('graded'),
  points: v.array(rubricPointResult),
  isPass: v.boolean(),
  gradedAt: v.number()
});

export const conceptActivityDetail = v.union(
  quizAnswer,
  explainBackPending,
  explainBackGraded,
  articleCheckIn,
  videoWatch
);

export const masteryCard = v.object({
  cardId: v.union(v.string(), v.number()),
  stability: v.number(),
  stabilityFast: v.number(),
  difficulty: v.number(),
  state: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3)),
  scheduleStatus: v.union(v.literal('new'), v.literal('learning'), v.literal('review')),
  dueAt: v.number(),
  lastReviewAt: v.union(v.number(), v.null()),
  reps: v.number(),
  lapses: v.number(),
  scheduledDays: v.number(),
  learningStep: v.number()
});

export const masteryResult = v.union(v.literal('pass'), v.literal('fail'));

export const masteryRow = v.object({
  deviceId: v.string(),
  userId: v.optional(v.string()),
  courseId: v.string(),
  conceptId: v.string(),
  attempts: v.number(),
  correct: v.number(),
  lastResult: masteryResult,
  card: masteryCard,
  updatedAt: v.number()
});

export const conceptActivityRow = v.object({
  deviceId: v.string(),
  userId: v.optional(v.string()),
  courseId: v.string(),
  moduleId: v.string(),
  conceptId: v.string(),
  subjectId: v.string(),
  detail: conceptActivityDetail,
  updatedAt: v.number()
});
