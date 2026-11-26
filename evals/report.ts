import type { CaseResult, EvalReport } from './types';

const REPLY_CHARS_SHOWN = 300;

const COUNT_WIDTH = 8;

const formatRatio = (value: number | null) => (value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`);

const formatCounts = (counts: number[]) => counts.map((count) => String(count).padStart(COUNT_WIDTH)).join('  ');

function describeDisagreement(result: CaseResult): string[] {
  const found = result.problems.length > 0 ? result.problems.join(' | ') : 'no problems found';
  return [
    `- ${result.id} (${result.kind}): expected ${result.expected}, got ${result.got}`,
    `    label: ${result.reason}`,
    `    check: ${result.error ?? found}`,
    ...(result.error === undefined ? [] : [`    reply: ${result.reply.slice(0, REPLY_CHARS_SHOWN)}`])
  ];
}

export function formatReport(report: EvalReport): string {
  const { score } = report;
  const { confusion } = score;
  return [
    `${report.checkId} ${report.checkVersion}, judge ${report.judge}, ${score.total} cases`,
    '',
    `accuracy        ${formatRatio(score.accuracy)} (${score.correct} of ${score.total})`,
    `fail precision  ${formatRatio(score.failPrecision)}`,
    `fail recall     ${formatRatio(score.failRecall)}`,
    `clear cases     ${score.accuracyByKind.clear.correct} of ${score.accuracyByKind.clear.total} agree`,
    `borderline      ${score.accuracyByKind.borderline.correct} of ${score.accuracyByKind.borderline.total} agree`,
    `errors          ${score.errors}`,
    `cost            $${report.costUSD.toFixed(4)}`,
    ...(report.knownLimit === undefined ? [] : [`known limit     ${report.knownLimit}`]),
    '',
    '              got fail  got pass     error',
    `label fail  ${formatCounts([confusion.failCaught, confusion.failMissed, confusion.failErrored])}`,
    `label pass  ${formatCounts([confusion.passFlagged, confusion.passKept, confusion.passErrored])}`,
    '',
    report.disagreements.length === 0 ? 'No disagreements.' : 'Disagreements:',
    ...report.disagreements.flatMap(describeDisagreement)
  ].join('\n');
}
