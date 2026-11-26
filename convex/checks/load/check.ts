import { countWords, listSectionTextFields } from '../moduleText';
import { loadThresholds } from './thresholds';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem } from '../types';

function checkLoad({ pack, map }: CheckInput): CheckOutcome {
  const plan = map.modules.find((candidate) => candidate.id === pack.id);
  const taught = [...new Set(pack.conceptIds ?? plan?.conceptIds ?? [])];
  const problems: CheckProblem[] = [];
  const notes: string[] = [];
  if (taught.length > loadThresholds.maxNewConcepts) {
    problems.push({
      where: pack.id,
      message: `teaches ${taught.length} new concepts, at most ${loadThresholds.maxNewConcepts} allowed`
    });
    notes.push(
      `this module teaches ${taught.length} new concepts (${taught.join(', ')}); keep at most ${loadThresholds.maxNewConcepts} and move the rest to their own module`
    );
  }
  for (const section of pack.sections) {
    const words = listSectionTextFields(section).reduce((total, field) => total + countWords(field.text), 0);
    if (words <= loadThresholds.maxWordsPerSection) continue;
    problems.push({
      where: section.id,
      message: `runs ${words} words, the limit is ${loadThresholds.maxWordsPerSection}`
    });
    notes.push(
      `section "${section.title}" runs ${words} words against a limit of ${loadThresholds.maxWordsPerSection}; cut it back or split it into two sections`
    );
  }
  return { pass: problems.length === 0, problems, fixNote: notes.join('; ') };
}

export const loadCheck: CheckModule = {
  checkId: 'load',
  version: '1.0.0',
  stage: 'code',
  run: checkLoad
};
