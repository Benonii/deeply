import { parseCitations } from '../../lib/lessonLint';
import { collapseSpaces, listTextFields, shorten, stripInlineCode, stripMarks } from '../moduleText';
import { factsCitedPrompt } from './prompt';
import { factsCitedThresholds } from './thresholds';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem } from '../types';

const quote = (text: string) => shorten(text, factsCitedThresholds.sentenceCharsInFixNote);

const searchable = (text: string) => collapseSpaces(stripMarks(text)).toLowerCase();

function findUnresolvedMarks({ pack, map }: CheckInput): CheckProblem[] {
  const sourceIds = new Set(map.sources.map((source) => source.id));
  const problems: CheckProblem[] = [];
  for (const field of listTextFields(pack))
    for (const citation of parseCitations(stripInlineCode(field.text)))
      if (!sourceIds.has(citation.sourceId))
        problems.push({ where: field.where, message: `[^${citation.sourceId}] is not a source in the concept map` });
  return problems;
}

function checkCitations(input: CheckInput): CheckOutcome {
  const problems = findUnresolvedMarks(input);
  const notes = problems.map((problem) => `${problem.message} (${problem.where}); cite a source the map lists`);
  const flagged = input.submission?.factualSentences;
  if (flagged === undefined)
    return {
      pass: false,
      problems: [...problems, { where: input.pack.id, message: 'no factual sentences were flagged' }],
      fixNote: [...notes, 'flag every factual sentence of this module and say whether its source supports it'].join(
        '; '
      )
    };
  if (flagged.length < factsCitedThresholds.minimumFlaggedSentences) {
    problems.push({
      where: input.pack.id,
      message: `${flagged.length} factual sentences flagged, at least ${factsCitedThresholds.minimumFlaggedSentences} expected`
    });
    notes.push(
      `only ${flagged.length} sentences of this module were flagged as factual; a module that teaches anything states at least ${factsCitedThresholds.minimumFlaggedSentences} fact, so read it again or cut the claims`
    );
  }
  const sourceIds = new Set(input.map.sources.map((source) => source.id));
  const fields = listTextFields(input.pack).map((field) => ({ where: field.where, text: searchable(field.text) }));
  for (const sentence of flagged) {
    const where = sentence.where;
    if (!fields.some((field) => field.text.includes(searchable(sentence.sentence)))) {
      problems.push({ where, message: `flagged sentence is not in the lesson text: "${quote(sentence.sentence)}"` });
      notes.push(`the flagged sentence "${quote(sentence.sentence)}" is not in the lesson, so nothing was checked`);
      continue;
    }
    const citations = parseCitations(sentence.sentence);
    if (citations.length === 0) {
      problems.push({ where, message: `factual sentence carries no [^source] mark: "${quote(sentence.sentence)}"` });
      notes.push(`"${quote(sentence.sentence)}" states a fact with no [^source] mark; cite a source or cut the claim`);
      continue;
    }
    for (const citation of citations)
      if (!sourceIds.has(citation.sourceId))
        problems.push({ where, message: `[^${citation.sourceId}] is not a source in the concept map` });
    if (factsCitedThresholds.acceptedVerdicts.includes(sentence.verdict)) continue;
    const reason = sentence.note === undefined ? '' : ` (${sentence.note})`;
    problems.push({ where, message: `the cited claim is ${sentence.verdict}: "${quote(sentence.sentence)}"${reason}` });
    notes.push(
      `the source behind "${quote(sentence.sentence)}" leaves it ${sentence.verdict}${reason}; rewrite the sentence to what the source says or cite one that says it`
    );
  }
  return { pass: problems.length === 0, problems, fixNote: notes.join('; ') };
}

export const factsCitedCheck: CheckModule = {
  checkId: 'facts-cited',
  version: '1.0.0',
  stage: 'agent',
  prompt: factsCitedPrompt,
  run: checkCitations
};
