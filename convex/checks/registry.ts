import { answerKeysCheck } from './answerKeys/check';
import { codeRunsCheck } from './codeRuns/check';
import { factsCitedCheck } from './factsCited/check';
import { jargonCheck } from './jargon/check';
import { linksAndVideosCheck } from './linksAndVideos/check';
import { loadCheck } from './load/check';
import { orderCheck } from './order/check';
import { quizQualityCheck } from './quizQuality/check';
import { teachingQualityCheck } from './teachingQuality/check';
import type { CheckRegistration } from './types';

export const CHECK_REGISTRY: CheckRegistration[] = [
  { check: codeRunsCheck, mode: 'on' },
  { check: answerKeysCheck, mode: 'on' },
  { check: factsCitedCheck, mode: 'shadow' },
  { check: orderCheck, mode: 'on' },
  { check: jargonCheck, mode: 'shadow' },
  { check: loadCheck, mode: 'on' },
  { check: quizQualityCheck, mode: 'shadow' },
  { check: linksAndVideosCheck, mode: 'on' },
  { check: teachingQualityCheck, mode: 'on' }
];
