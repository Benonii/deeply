import { teachingQualityThresholds } from './thresholds';
import type { TeachingScores } from '../submissionSchema';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem } from '../types';

type ScoredCriterion = Exclude<keyof TeachingScores, 'note'>;

interface Criterion {
  key: ScoredCriterion;
  label: string;
  fix: string;
}

const CRITERIA: Criterion[] = [
  {
    key: 'objectiveStated',
    label: 'objective stated',
    fix: 'open with the one thing the reader will be able to do at the end'
  },
  { key: 'workedExample', label: 'worked example', fix: 'walk one real example through from start to finish' },
  { key: 'practice', label: 'practice', fix: 'give the reader something to answer, not only something to read' },
  {
    key: 'mistakeAddressed',
    label: 'mistake addressed',
    fix: 'name the mistake learners make here and show what happens when they make it'
  },
  { key: 'levelFits', label: 'level fits', fix: 'cut what this reader already knows and explain what they do not' }
];

function scoreTeaching({ pack, submission }: CheckInput): CheckOutcome {
  const scores = submission?.teachingScores;
  if (scores === undefined)
    return {
      pass: true,
      problems: [{ where: pack.id, message: 'teaching quality was not judged' }],
      fixNote: ''
    };
  const problems: CheckProblem[] = [];
  const notes: string[] = [];
  for (const criterion of CRITERIA) {
    const score = scores[criterion.key];
    if (score >= teachingQualityThresholds.flagBelow) continue;
    problems.push({
      where: pack.id,
      message: `${criterion.label} scores ${score} of ${teachingQualityThresholds.topScore}`
    });
    notes.push(`${criterion.label} scores ${score} of ${teachingQualityThresholds.topScore}: ${criterion.fix}`);
  }
  if (scores.note !== undefined && problems.length > 0) notes.push(`judge's note: ${scores.note}`);
  return { pass: true, problems, fixNote: notes.join('; ') };
}

export const teachingQualityCheck: CheckModule = {
  checkId: 'teaching-quality',
  version: '1.0.0',
  stage: 'agent',
  run: scoreTeaching
};
