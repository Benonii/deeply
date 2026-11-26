import { collapseSpaces, listQuizQuestions, shorten } from '../moduleText';
import { quizQualityPrompt } from './prompt';
import { quizQualityThresholds } from './thresholds';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem, QuizQuestion } from '../types';

const comparable = (option: string) =>
  collapseSpaces(option)
    .toLowerCase()
    .replace(/[.;]+$/, '');

function findDuplicateOptions(question: QuizQuestion): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const option of question.options) {
    const key = comparable(option);
    if (seen.has(key)) duplicates.push(option);
    seen.add(key);
  }
  return duplicates;
}

function checkOneQuestion(question: QuizQuestion, knownConceptIds: Set<string>): CheckProblem[] {
  const problems: CheckProblem[] = [];
  if (question.conceptId === undefined) problems.push({ where: question.where, message: 'tags no concept' });
  else if (!knownConceptIds.has(question.conceptId))
    problems.push({
      where: question.where,
      message: `tags ${question.conceptId}, which the concept map does not list`
    });
  if (question.answer < 0 || question.answer >= question.options.length)
    problems.push({
      where: question.where,
      message: `answer is ${question.answer}, outside its ${question.options.length} options`
    });
  if (question.options.length < quizQualityThresholds.minOptions)
    problems.push({
      where: question.where,
      message: `has ${question.options.length} options, at least ${quizQualityThresholds.minOptions} needed`
    });
  if (question.options.length > quizQualityThresholds.maxOptions)
    problems.push({
      where: question.where,
      message: `has ${question.options.length} options, at most ${quizQualityThresholds.maxOptions} allowed`
    });
  for (const duplicate of findDuplicateOptions(question))
    problems.push({ where: question.where, message: `option "${shorten(duplicate, 40)}" appears twice` });
  return problems;
}

function checkQuizQuality(input: CheckInput): CheckOutcome {
  const questions = listQuizQuestions(input.pack);
  if (questions.length === 0)
    return {
      pass: false,
      problems: [{ where: input.pack.id, message: 'the module has no check block' }],
      fixNote: 'add at least one check block, tagged to a concept this module teaches'
    };
  const knownConceptIds = new Set(input.map.concepts.map((concept) => concept.id));
  const problems: CheckProblem[] = [];
  const notes: string[] = [];
  for (const question of questions) {
    const found = checkOneQuestion(question, knownConceptIds);
    problems.push(...found);
    for (const problem of found)
      notes.push(
        `quiz ${question.position} ("${shorten(question.question, quizQualityThresholds.questionCharsInFixNote)}") ${problem.message}`
      );
  }
  const verdicts = input.submission?.quizDistractors;
  if (verdicts === undefined) {
    problems.push({ where: input.pack.id, message: 'no verdict on where the wrong options come from' });
    notes.push('say, for each quiz, whether its wrong options are mistakes learners really make');
    return { pass: false, problems, fixNote: notes.join('; ') };
  }
  for (const question of questions) {
    const verdict = verdicts.find((candidate) => candidate.block === question.position);
    if (verdict === undefined) {
      problems.push({ where: question.where, message: `quiz ${question.position} has no distractor verdict` });
      notes.push(`quiz ${question.position} was not judged on its wrong options`);
      continue;
    }
    if (verdict.hasMistakeBasedOptions) continue;
    const reason = verdict.note === undefined ? '' : `: ${verdict.note}`;
    problems.push({
      where: question.where,
      message: `wrong options are not drawn from known mistakes${reason}`
    });
    notes.push(
      `quiz ${question.position} has wrong options nobody would pick${reason}; replace them with the mistakes learners actually make`
    );
  }
  return { pass: problems.length === 0, problems, fixNote: notes.join('; ') };
}

export const quizQualityCheck: CheckModule = {
  checkId: 'quiz-quality',
  version: '1.0.0',
  stage: 'agent',
  prompt: quizQualityPrompt,
  run: checkQuizQuality
};
