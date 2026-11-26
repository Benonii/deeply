import { listQuizQuestions, shorten } from '../moduleText';
import { answerKeysThresholds } from './thresholds';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem } from '../types';
import type { QuizAnswer } from '../submissionSchema';

interface Asked {
  label: string;
  where: string;
  question: string;
  options: string[];
  answer: number;
  chosen?: number;
}

const letter = (index: number) => String.fromCharCode(65 + index);

const describeOption = (options: string[], index: number) =>
  index >= 0 && index < options.length
    ? `${letter(index)} "${shorten(options[index], answerKeysThresholds.optionCharsInFixNote)}"`
    : `option ${index}, which does not exist`;

function listAsked({ pack, challenges }: CheckInput, answers: QuizAnswer[]): Asked[] {
  const quizzes = listQuizQuestions(pack).map((quiz) => ({
    label: `quiz ${quiz.position}`,
    where: quiz.where,
    question: quiz.question,
    options: quiz.options,
    answer: quiz.answer,
    chosen: answers.find((answer) => answer.target === 'quiz' && answer.block === quiz.position)?.chosen
  }));
  const asChallenges = (challenges ?? []).map((challenge) => ({
    label: `challenge ${challenge.id}`,
    where: `${pack.id}/challenge ${challenge.id}`,
    question: challenge.q,
    options: challenge.options,
    answer: challenge.answer,
    chosen: answers.find((answer) => answer.target === 'challenge' && answer.id === challenge.id)?.chosen
  }));
  return [...quizzes, ...asChallenges];
}

function compareAnswers(input: CheckInput): CheckOutcome {
  const asked = listAsked(input, []);
  if (asked.length === 0) return { pass: true, problems: [], fixNote: '' };
  const answers = input.submission?.quizAnswers;
  if (answers === undefined)
    return {
      pass: false,
      problems: [{ where: input.pack.id, message: `${asked.length} questions, none answered` }],
      fixNote: `answer all ${asked.length} questions of this module without reading the answer key`
    };
  const problems: CheckProblem[] = [];
  const notes: string[] = [];
  for (const question of listAsked(input, answers)) {
    const asQuoted = shorten(question.question, answerKeysThresholds.questionCharsInFixNote);
    if (question.chosen === undefined) {
      problems.push({ where: question.where, message: `${question.label} was not answered` });
      notes.push(`${question.label} ("${asQuoted}") was not answered, so its key is unverified`);
      continue;
    }
    if (question.chosen === question.answer) continue;
    problems.push({
      where: question.where,
      message: `${question.label} was answered ${describeOption(question.options, question.chosen)}, the key says ${describeOption(question.options, question.answer)}`
    });
    notes.push(
      `${question.label} ("${asQuoted}") was answered ${describeOption(question.options, question.chosen)} but the key says ${describeOption(question.options, question.answer)}; fix the key or make the question unambiguous`
    );
  }
  return { pass: problems.length === 0, problems, fixNote: notes.join('; ') };
}

export const answerKeysCheck: CheckModule = {
  checkId: 'answer-keys',
  version: '1.0.0',
  stage: 'agent',
  run: compareAnswers
};
