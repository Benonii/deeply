import { parseTermReferences } from '../../lib/lessonLint';
import { listTextFields, shorten } from '../moduleText';
import { jargonPrompt } from './prompt';
import { jargonThresholds } from './thresholds';
import type { GlossaryTerm } from '../../lib/courseSchema';
import type { CheckInput, CheckModule, CheckOutcome, CheckProblem } from '../types';

function normalizeWord(word: string): string {
  const bare = word.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return bare.endsWith('s') ? bare.slice(0, -1) : bare;
}

function listMarkedWords({ pack }: CheckInput): Set<string> {
  const marked = new Set<string>();
  for (const field of listTextFields(pack))
    for (const reference of parseTermReferences(field.text)) {
      marked.add(normalizeWord(reference.id));
      marked.add(normalizeWord(reference.display));
    }
  return marked;
}

function listDefinedWords(terms: GlossaryTerm[]): Set<string> {
  const defined = new Set<string>();
  for (const term of terms) {
    defined.add(normalizeWord(term.id));
    defined.add(normalizeWord(term.term));
  }
  return defined;
}

function checkJargon(input: CheckInput): CheckOutcome {
  const words = input.submission?.coldReaderWords;
  if (words === undefined)
    return {
      pass: false,
      problems: [{ where: input.pack.id, message: 'no cold-reader word list was submitted' }],
      fixNote: 'read the module as a newcomer and list every word a newcomer would not know'
    };
  const marked = listMarkedWords(input);
  const defined = listDefinedWords([...(input.pack.glossary ?? []), ...(input.termsTaughtEarlier ?? [])]);
  const skipped = new Set(jargonThresholds.wordsNeedingNoMark.map(normalizeWord));
  const problems: CheckProblem[] = [];
  const notes: string[] = [];
  const seen = new Set<string>();
  for (const entry of words) {
    const word = normalizeWord(entry.word);
    if (word.length === 0 || skipped.has(word) || seen.has(word)) continue;
    seen.add(word);
    const shown = shorten(entry.word, jargonThresholds.wordCharsInFixNote);
    if (!defined.has(word)) {
      problems.push({ where: entry.where, message: `"${shown}" has no glossary entry` });
      notes.push(`"${shown}" is jargon with no definition; add a glossary entry for it and mark it [[${word}]]`);
      continue;
    }
    if (marked.has(word)) continue;
    problems.push({ where: entry.where, message: `"${shown}" is defined but never marked in the text` });
    notes.push(`"${shown}" is in the glossary but never marked; write it as [[${word}]] where it first appears`);
  }
  return { pass: problems.length === 0, problems, fixNote: notes.join('; ') };
}

export const jargonCheck: CheckModule = {
  checkId: 'jargon',
  version: '1.0.0',
  stage: 'agent',
  prompt: jargonPrompt,
  run: checkJargon
};
