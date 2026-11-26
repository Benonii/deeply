import { z } from 'zod';

export const CodeRunReport = z.object({
  block: z.number().int().min(1).describe('1-based position among the runnable code blocks of this module'),
  stdout: z.string().describe('everything the block printed, verbatim'),
  error: z.string().optional().describe('the error text, when the block did not finish')
});
export type CodeRunReport = z.infer<typeof CodeRunReport>;

export const QuizAnswer = z.discriminatedUnion('target', [
  z.object({
    target: z.literal('quiz'),
    block: z.number().int().min(1).describe('1-based position among the check blocks of this module'),
    chosen: z.number().int().min(0).describe('index of the option the agent picked')
  }),
  z.object({
    target: z.literal('challenge'),
    id: z.string().min(1).describe('the challenge id'),
    chosen: z.number().int().min(0)
  })
]);
export type QuizAnswer = z.infer<typeof QuizAnswer>;

export const FactualSentence = z.object({
  where: z.string().min(1).describe('the section id the sentence sits in'),
  sentence: z.string().min(1).describe('the sentence verbatim from the lesson, marks included'),
  verdict: z.enum(['supported', 'unsupported', 'unclear']).describe('does the cited claim support the sentence'),
  note: z.string().optional()
});
export type FactualSentence = z.infer<typeof FactualSentence>;

export const ColdReaderWord = z.object({
  word: z.string().min(1).describe('a word a first-time reader would not know'),
  where: z.string().min(1).describe('the section id it was read in')
});
export type ColdReaderWord = z.infer<typeof ColdReaderWord>;

export const QuizDistractorVerdict = z.object({
  block: z.number().int().min(1),
  hasMistakeBasedOptions: z.boolean().describe('do the wrong options come from mistakes learners really make'),
  note: z.string().optional()
});
export type QuizDistractorVerdict = z.infer<typeof QuizDistractorVerdict>;

const TeachingScore = z.number().int().min(1).max(5);

export const TeachingScores = z.object({
  objectiveStated: TeachingScore,
  workedExample: TeachingScore,
  practice: TeachingScore,
  mistakeAddressed: TeachingScore,
  levelFits: TeachingScore,
  note: z.string().optional()
});
export type TeachingScores = z.infer<typeof TeachingScores>;

export const CheckSubmission = z.object({
  codeRuns: z.array(CodeRunReport).optional(),
  quizAnswers: z.array(QuizAnswer).optional(),
  factualSentences: z.array(FactualSentence).optional(),
  coldReaderWords: z.array(ColdReaderWord).optional(),
  quizDistractors: z.array(QuizDistractorVerdict).optional(),
  teachingScores: TeachingScores.optional()
});
export type CheckSubmission = z.infer<typeof CheckSubmission>;
