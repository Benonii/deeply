import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DefaultScheduler, Rating } from 'ts-fsrs';

import { reviewMasteryCard } from './mastery';
import { masteryCard } from './validators';

const reviewedAt = new Date('2026-11-26T09:00:00.000Z');
const nextDay = new Date('2026-11-27T09:00:00.000Z');

describe('mastery cards', () => {
  it('stores every field the scheduler puts on a new card', async () => {
    const scheduler = await DefaultScheduler();
    const schedulerFields = Object.keys(scheduler.newCard({ now: reviewedAt })).sort();
    assert.deepEqual(Object.keys(masteryCard.fields).sort(), schedulerFields);
  });

  it('schedules the same review as the library default scheduler', async () => {
    const scheduler = await DefaultScheduler();
    const theirs = scheduler.review({
      card: scheduler.newCard({ now: reviewedAt }),
      now: reviewedAt,
      grade: Rating.Good
    }).card;
    const ours = reviewMasteryCard(undefined, true, reviewedAt);
    assert.equal(ours.stability, theirs.stability);
    assert.equal(ours.difficulty, theirs.difficulty);
    assert.equal(ours.dueAt, theirs.dueAt.getTime());
    assert.equal(ours.scheduleStatus, theirs.scheduleStatus);
  });

  it('schedules a first review when the answer is right', () => {
    const card = reviewMasteryCard(undefined, true, reviewedAt);
    assert.equal(card.reps, 1);
    assert.equal(card.lapses, 0);
    assert.ok(card.stability > 0);
    assert.ok(card.dueAt > reviewedAt.getTime());
    assert.equal(card.lastReviewAt, reviewedAt.getTime());
  });

  it('counts a lapse and pulls the review in when the answer is wrong', () => {
    const passed = reviewMasteryCard(undefined, true, reviewedAt);
    const lapsed = reviewMasteryCard(passed, false, nextDay);
    assert.equal(lapsed.reps, 2);
    assert.equal(lapsed.lapses, 1);
    assert.ok(lapsed.dueAt < passed.dueAt);
    assert.ok(lapsed.difficulty > passed.difficulty);
  });

  it('keeps counting reps when a stored card is handed back to the scheduler', () => {
    const first = reviewMasteryCard(undefined, true, reviewedAt);
    const second = reviewMasteryCard(first, true, nextDay);
    assert.equal(second.reps, 2);
    assert.equal(second.scheduleStatus, 'review');
  });
});
