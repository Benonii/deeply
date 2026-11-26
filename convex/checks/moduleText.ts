import { TERM_MARK } from '../lib/lessonLint';
import type { ModulePack, Section } from '../lib/courseSchema';
import type { LinkTarget, QuizQuestion, RunnableCodeBlock, TextField, VideoTarget } from './types';

export { normalizeOutput } from '../lib/outputText';

const KEYS_OUTSIDE_PROSE = new Set([
  'code',
  'lang',
  'runnable',
  'expectedOutput',
  'youtubeId',
  'url',
  'conceptId',
  'conceptIds',
  'type',
  'kind',
  'id'
]);

const MARKDOWN_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;

const INLINE_CODE = /`[^`\n]*`/g;

const collectProseStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectProseStrings);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value)
    .filter(([key]) => !KEYS_OUTSIDE_PROSE.has(key))
    .flatMap(([, entry]) => collectProseStrings(entry));
};

export function listSectionTextFields(section: Section): TextField[] {
  const fields: TextField[] = [{ where: `${section.id}/title`, text: section.title }];
  section.blocks.forEach((block, index) => {
    for (const text of collectProseStrings(block)) fields.push({ where: `${section.id}/block ${index + 1}`, text });
  });
  return fields;
}

export function listTextFields(pack: ModulePack): TextField[] {
  const fields: TextField[] = [
    { where: `${pack.id}/title`, text: pack.title },
    { where: `${pack.id}/kicker`, text: pack.kicker },
    { where: `${pack.id}/summary`, text: pack.summary }
  ];
  for (const term of pack.glossary ?? [])
    fields.push({ where: `${pack.id}/glossary ${term.id}`, text: `${term.term}: ${term.definition}` });
  for (const section of pack.sections) fields.push(...listSectionTextFields(section));
  return fields;
}

export function listRunnableCodeBlocks(pack: ModulePack): RunnableCodeBlock[] {
  const blocks: RunnableCodeBlock[] = [];
  for (const section of pack.sections)
    for (const block of section.blocks) {
      if (block.type !== 'code' || block.runnable === undefined) continue;
      blocks.push({
        position: blocks.length + 1,
        where: `${section.id}/${block.title ?? block.lang}`,
        lang: block.runnable,
        code: block.code,
        expectedOutput: block.expectedOutput
      });
    }
  return blocks;
}

export function listQuizQuestions(pack: ModulePack): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  for (const section of pack.sections)
    for (const block of section.blocks) {
      if (block.type !== 'check') continue;
      questions.push({
        position: questions.length + 1,
        where: `${section.id}/quiz ${questions.length + 1}`,
        question: block.q,
        options: block.options,
        answer: block.answer,
        conceptId: block.conceptId
      });
    }
  return questions;
}

export function listVideoTargets(pack: ModulePack): VideoTarget[] {
  const videos: VideoTarget[] = [];
  for (const section of pack.sections)
    for (const block of section.blocks) {
      if (block.type !== 'video') continue;
      videos.push({
        position: videos.length + 1,
        where: `${section.id}/video ${videos.length + 1}`,
        youtubeId: block.youtubeId,
        startSec: block.startSec,
        endSec: block.endSec
      });
    }
  return videos;
}

export function listLinkTargets(pack: ModulePack): LinkTarget[] {
  const links: LinkTarget[] = [];
  for (const section of pack.sections)
    section.blocks.forEach((block, index) => {
      if (block.type === 'article') links.push({ where: `${section.id}/block ${index + 1}`, url: block.url });
    });
  for (const field of listTextFields(pack))
    for (const match of stripInlineCode(field.text).matchAll(MARKDOWN_LINK))
      links.push({ where: field.where, url: match[2] });
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

export function stripInlineCode(text: string): string {
  return text.replace(INLINE_CODE, ' ');
}

export function stripMarks(text: string): string {
  return text
    .replace(TERM_MARK, (_match, id: string, display?: string) => display ?? id)
    .replace(/\[\^[^\]\n]+\]/g, '')
    .replace(MARKDOWN_LINK, '$1')
    .replace(/[`*]/g, '');
}

export function countWords(text: string): number {
  return stripMarks(text)
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word)).length;
}

export function mentionsPhrase(text: string, phrase: string): boolean {
  const escaped = phrase
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  if (escaped.length === 0) return false;
  return new RegExp(`\\b${escaped}(?:e?s)?\\b`, 'i').test(stripMarks(text));
}

export function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function shorten(text: string, limit: number): string {
  const flat = collapseSpaces(text);
  return flat.length <= limit ? flat : `${flat.slice(0, limit - 1)}…`;
}
