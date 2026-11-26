import { answerKeysCheck } from '../convex/checks/answerKeys/check';
import { factsCitedCheck } from '../convex/checks/factsCited/check';
import { jargonCheck } from '../convex/checks/jargon/check';
import { quizQualityCheck } from '../convex/checks/quizQuality/check';
import { teachingQualityCheck } from '../convex/checks/teachingQuality/check';
import { buildCaseMap, buildCasePack, buildCaseSection } from './casePack';
import { buildCaseSource, CASE_CONCEPT_ID, stripAnswerKeys } from './casePack';
import { formatJSONBlock } from './prompt';
import { FactsCitedCase, JargonCase, QuizCase, TeachingQualityCase } from './validators';

import type { z } from 'zod';
import type { CheckID, CheckInput } from '../convex/checks/types';
import type { Block } from '../convex/lib/courseSchema';
import type { CalibrationCase, EvalTarget, PreparedCase } from './types';

function prepareCasesWith<Case extends CalibrationCase>(
  schema: z.ZodType<Case>,
  buildInput: (calibrationCase: Case) => CheckInput
): (raw: unknown) => PreparedCase[] {
  return (raw) =>
    schema
      .array()
      .parse(raw)
      .map((calibrationCase) => ({ calibrationCase, input: buildInput(calibrationCase) }));
}

const describeModule = (module: unknown) => ['## The module', formatJSONBlock(module)];

const toParagraphs = (text: string[]): Block[] => text.map((paragraph) => ({ type: 'p', text: paragraph }));

function buildQuizInput(calibrationCase: QuizCase): CheckInput {
  const quiz: Block = {
    type: 'check',
    q: calibrationCase.question,
    options: calibrationCase.options,
    answer: calibrationCase.key,
    explain: '',
    conceptId: CASE_CONCEPT_ID
  };
  const blocks = calibrationCase.lesson === undefined ? [quiz] : [...toParagraphs([calibrationCase.lesson]), quiz];
  return {
    pack: buildCasePack({ topic: calibrationCase.topic, sections: [buildCaseSection(blocks)] }),
    map: buildCaseMap({ topic: calibrationCase.topic })
  };
}

const answerKeysTarget: EvalTarget = {
  check: answerKeysCheck,
  prepareCases: prepareCasesWith(QuizCase, buildQuizInput),
  describeMaterial: (input) => describeModule(stripAnswerKeys(input.pack)),
  knownLimit:
    'accepted for V1: a question with two defensible answers passes whenever the judge picks the stored key, so ambiguity is rarely caught'
};

const quizQualityTarget: EvalTarget = {
  check: quizQualityCheck,
  prepareCases: prepareCasesWith(QuizCase, buildQuizInput),
  describeMaterial: (input) => describeModule(input.pack)
};

const factsCitedTarget: EvalTarget = {
  check: factsCitedCheck,
  prepareCases: prepareCasesWith(FactsCitedCase, (calibrationCase) => ({
    pack: buildCasePack({
      topic: calibrationCase.topic,
      sections: [buildCaseSection(toParagraphs(calibrationCase.text))]
    }),
    map: buildCaseMap({
      topic: calibrationCase.topic,
      sources: calibrationCase.sources.map((source) => buildCaseSource(source.id, source.quote))
    })
  })),
  describeMaterial: (input) => [
    ...describeModule(input.pack),
    '',
    '## The concept map sources',
    formatJSONBlock(input.map.sources)
  ]
};

const jargonTarget: EvalTarget = {
  check: jargonCheck,
  prepareCases: prepareCasesWith(JargonCase, (calibrationCase) => ({
    pack: buildCasePack({
      topic: calibrationCase.topic,
      glossary: calibrationCase.glossary,
      sections: [buildCaseSection(toParagraphs(calibrationCase.text))]
    }),
    map: buildCaseMap({ topic: calibrationCase.topic })
  })),
  describeMaterial: (input) => describeModule(input.pack)
};

const teachingQualityTarget: EvalTarget = {
  check: teachingQualityCheck,
  prepareCases: prepareCasesWith(TeachingQualityCase, (calibrationCase) => ({
    pack: buildCasePack({
      topic: calibrationCase.topic,
      summary: calibrationCase.summary,
      sections: calibrationCase.sections
    }),
    map: buildCaseMap({ topic: calibrationCase.topic, goal: calibrationCase.goal })
  })),
  describeMaterial: (input) => [`Course goal: ${input.map.goal.text}`, '', ...describeModule(input.pack)]
};

export const EVAL_TARGETS: Partial<Record<CheckID, EvalTarget>> = {
  'answer-keys': answerKeysTarget,
  'facts-cited': factsCitedTarget,
  jargon: jargonTarget,
  'quiz-quality': quizQualityTarget,
  'teaching-quality': teachingQualityTarget
};
