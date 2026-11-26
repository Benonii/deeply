import { dateChrono, defineScheduler, Rating } from 'ts-fsrs';
import { defaultLearningSteps, defaultRelearningSteps, DEFAULT_MAXIMUM_INTERVAL } from 'ts-fsrs';
import { default_request_retention } from 'ts-fsrs';
import { schedulerDesiredRetentionMiddleware, schedulerFuzzingMiddleware, schedulerStatsMiddleware } from 'ts-fsrs';
import { schedulerLearningStepsMiddleware, schedulerScheduledDaysMiddleware } from 'ts-fsrs';
import { schedulerMaximumIntervalMiddleware, schedulerMonotonicIntervalMiddleware } from 'ts-fsrs';
import { FSRS7Model, migrateFSRS7Parameters } from 'ts-fsrs/models/fsrs-7';

import type { MasteryCard } from './types';

const scheduler = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
  .use(
    schedulerDesiredRetentionMiddleware,
    schedulerFuzzingMiddleware,
    schedulerStatsMiddleware,
    schedulerScheduledDaysMiddleware,
    schedulerLearningStepsMiddleware,
    schedulerMaximumIntervalMiddleware,
    schedulerMonotonicIntervalMiddleware
  )
  .create({
    config: {
      fractionalDays: true,
      weights: migrateFSRS7Parameters(),
      enableShortTerm: true,
      desiredRetention: default_request_retention,
      learningSteps: Array.from(defaultLearningSteps),
      relearningSteps: Array.from(defaultRelearningSteps),
      allowModelOverride: true,
      enableFuzz: false,
      maximumInterval: DEFAULT_MAXIMUM_INTERVAL
    }
  });

type SchedulerCard = ReturnType<typeof scheduler.newCard>;

function storeCard(card: SchedulerCard): MasteryCard {
  return {
    ...card,
    dueAt: card.dueAt.getTime(),
    lastReviewAt: card.lastReviewAt === null ? null : card.lastReviewAt.getTime()
  };
}

function restoreCard(card: MasteryCard) {
  return {
    ...card,
    dueAt: new Date(card.dueAt),
    lastReviewAt: card.lastReviewAt === null ? null : new Date(card.lastReviewAt)
  };
}

export function reviewMasteryCard(previous: MasteryCard | undefined, isCorrect: boolean, now: Date): MasteryCard {
  const card = previous ? restoreCard(previous) : scheduler.newCard({ now });
  const reviewed = scheduler.review({ card, now, grade: isCorrect ? Rating.Good : Rating.Again });
  return storeCard(reviewed.card);
}
