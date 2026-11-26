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

function splitWords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0)
    .map((word) => (word.endsWith('s') ? word.slice(0, -1) : word));
}

function isCoveredBy(word: string, phrases: string[][]): boolean {
  const words = splitWords(word);
  if (words.length === 0) return false;
  return phrases.some((phrase) =>
    phrase.some((_, start) => words.every((part, offset) => phrase[start + offset] === part))
  );
}

function listCoveredPhrases({ pack }: CheckInput, terms: GlossaryTerm[]) {
  const glossary = new Map(terms.map((term) => [normalizeWord(term.id), term]));
  const defined = terms.flatMap((term) => [splitWords(term.id), splitWords(term.term)]);
  const marked: string[][] = [];
  for (const field of listTextFields(pack))
    for (const reference of parseTermReferences(field.text)) {
      const term = glossary.get(normalizeWord(reference.id));
      marked.push(splitWords(reference.id), splitWords(reference.display));
      if (term === undefined) continue;
      defined.push(splitWords(reference.display));
      marked.push(splitWords(term.term));
    }
  return { defined, marked };
}

function checkJargon(input: CheckInput): CheckOutcome {
  const words = input.submission?.coldReaderWords;
  if (words === undefined)
    return {
      pass: false,
      problems: [{ where: input.pack.id, message: 'no cold-reader word list was submitted' }],
      fixNote: 'read the module as a newcomer and list every word a newcomer would not know'
    };
  const { defined, marked } = listCoveredPhrases(input, [
    ...(input.pack.glossary ?? []),
    ...(input.termsTaughtEarlier ?? [])
  ]);
  const skipped = new Set(jargonThresholds.wordsNeedingNoMark.map(normalizeWord));
  const problems: CheckProblem[] = [];
  const notes: string[] = [];
  const seen = new Set<string>();
  for (const entry of words) {
    const word = normalizeWord(entry.word);
    if (word.length === 0 || skipped.has(word) || seen.has(word)) continue;
    seen.add(word);
    const shown = shorten(entry.word, jargonThresholds.wordCharsInFixNote);
    if (!isCoveredBy(entry.word, defined)) {
      problems.push({ where: entry.where, message: `"${shown}" has no glossary entry` });
      notes.push(`"${shown}" is jargon with no definition; add a glossary entry for it and mark it [[${word}]]`);
      continue;
    }
    if (isCoveredBy(entry.word, marked)) continue;
    problems.push({ where: entry.where, message: `"${shown}" is defined but never marked in the text` });
    notes.push(`"${shown}" is in the glossary but never marked; write it as [[${word}]] where it first appears`);
  }
  return { pass: problems.length === 0, problems, fixNote: notes.join('; ') };
}

export const jargonCheck: CheckModule = {
  checkId: 'jargon',
  version: '1.1.0',
  stage: 'agent',
  prompt: jargonPrompt,
  run: checkJargon
};
