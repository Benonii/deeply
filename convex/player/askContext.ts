import { collapseSpaces, shorten } from '../checks/moduleText';
import { findModule, listCourseGlossary } from './courseSource';

import type { Block, GlossaryTerm, ModulePack, Section } from '../lib/courseSchema';
import type { Concept, ConceptMap } from '../lib/conceptMapSchema';
import type { AskContext, AskContextInput, AskContextPart, CourseSource } from './types';

const MAXIMUM_CONTEXT_CHARACTERS = 20000;
const SELECTED_SECTION_CHARACTERS = 6000;
const NEARBY_SECTION_CHARACTERS = 2500;
const MAXIMUM_CODE_CHARACTERS = 700;
const MAXIMUM_CONCEPTS = 14;
const MAXIMUM_CLAIMS = 8;
const MAXIMUM_TERMS = 24;
const MAXIMUM_QUOTE_CHARACTERS = 1200;
const MAXIMUM_QUESTION_CHARACTERS = 500;

function renderBlock(block: Block): string {
  switch (block.type) {
    case 'p':
      return block.text;
    case 'h3':
      return `### ${block.text}`;
    case 'list':
      return block.items.map((item) => `- ${item}`).join('\n');
    case 'callout':
      return block.title ? `${block.title}: ${block.text}` : block.text;
    case 'keyterms':
      return block.terms.map((term) => `- ${term.term}: ${term.def}`).join('\n');
    case 'compare':
      return [block.caption ?? '', block.head.join(' | '), ...block.rows.map((row) => row.join(' | '))]
        .filter((line) => line.length > 0)
        .join('\n');
    case 'code':
      return `\`\`\`${block.lang}\n${block.code.slice(0, MAXIMUM_CODE_CHARACTERS)}\n\`\`\`${block.note ? `\n${block.note}` : ''}`;
    case 'flow':
      return [block.title, ...block.steps.map((step) => `- ${step.title}: ${step.text}`)].join('\n');
    case 'check':
      return [
        `Quiz: ${block.q}`,
        ...block.options.map((option, index) => `  ${index === block.answer ? '✓' : '·'} ${option}`),
        block.explain
      ].join('\n');
    case 'video':
      return `Video: ${block.title} (${block.channel})`;
    case 'article':
      return `Article: ${block.title} (${block.site})`;
    case 'explainback':
      return [`Explain back: ${block.prompt}`, ...block.rubric.map((point) => `  - ${point}`)].join('\n');
    default: {
      const unreachable: never = block;
      return String(unreachable);
    }
  }
}

function renderSection(section: Section, limit: number) {
  const body = section.blocks.map(renderBlock).join('\n\n');
  const head = `## ${section.title}`;
  if (body.length <= limit) return { text: `${head}\n${body}`, isTrimmed: false };
  return { text: `${head}\n${body.slice(0, limit)}\n[trimmed]`, isTrimmed: true };
}

function listRelevantConcepts(map: ConceptMap, conceptIds: string[]): Concept[] {
  const wanted = new Set(conceptIds);
  for (const edge of map.edges) if (wanted.has(edge.to)) wanted.add(edge.from);
  const ordered = map.concepts.filter((concept) => wanted.has(concept.id));
  const rest = map.concepts.filter((concept) => !wanted.has(concept.id));
  return [...ordered, ...rest].slice(0, MAXIMUM_CONCEPTS);
}

function renderConcepts(map: ConceptMap, concepts: Concept[]): string {
  const prerequisites = new Map<string, string[]>();
  for (const edge of map.edges) prerequisites.set(edge.to, [...(prerequisites.get(edge.to) ?? []), edge.from]);
  const lines = concepts.map((concept) => {
    const needs = prerequisites.get(concept.id) ?? [];
    const suffix = needs.length > 0 ? ` [needs: ${needs.join(', ')}]` : '';
    return `- ${concept.id} (${concept.role}): ${concept.definition}${suffix}`;
  });
  return [`Course goal: ${map.goal.text}`, ...lines].join('\n');
}

function listClaims(map: ConceptMap, conceptIds: Set<string>): string[] {
  const lines: string[] = [];
  for (const source of map.sources)
    for (const claim of source.claims) {
      if (!conceptIds.has(claim.conceptId)) continue;
      lines.push(`- ${claim.conceptId}: "${collapseSpaces(claim.quote)}" — ${source.title} (${claim.url})`);
    }
  return lines.slice(0, MAXIMUM_CLAIMS);
}

function listTerms(pack: ModulePack, source: CourseSource): GlossaryTerm[] {
  const own = pack.glossary ?? [];
  const ownIds = new Set(own.map((term) => term.id));
  const earlier = listCourseGlossary(source).filter((term) => !ownIds.has(term.id));
  return [...own, ...earlier].slice(0, MAXIMUM_TERMS);
}

function orderSectionsByDistance(pack: ModulePack, sectionId: string): Section[] {
  const selectedIndex = pack.sections.findIndex((section) => section.id === sectionId);
  if (selectedIndex < 0) return pack.sections;
  return [...pack.sections].sort(
    (left, right) =>
      Math.abs(pack.sections.indexOf(left) - selectedIndex) - Math.abs(pack.sections.indexOf(right) - selectedIndex)
  );
}

function buildModuleText(pack: ModulePack, sectionId: string, budget: number) {
  const ordered = orderSectionsByDistance(pack, sectionId);
  const kept = new Map<string, string>();
  let used = 0;
  let isTrimmed = false;
  for (const section of ordered) {
    const limit = section.id === sectionId ? SELECTED_SECTION_CHARACTERS : NEARBY_SECTION_CHARACTERS;
    const rendered = renderSection(section, limit);
    if (used + rendered.text.length > budget) {
      isTrimmed = true;
      continue;
    }
    if (rendered.isTrimmed) isTrimmed = true;
    kept.set(section.id, rendered.text);
    used += rendered.text.length;
  }
  const inOrder = pack.sections
    .filter((section) => kept.has(section.id))
    .map((section) => kept.get(section.id) ?? '')
    .join('\n\n');
  return { text: inOrder, isTrimmed };
}

export function buildAskContext({ source, moduleId, sectionId, quote, question }: AskContextInput): AskContext | null {
  const pack = findModule(source, moduleId);
  if (!pack) return null;
  const section = pack.sections.find((candidate) => candidate.id === sectionId);
  const conceptIds = [...new Set([...(section?.conceptIds ?? []), ...(pack.conceptIds ?? [])])];
  const concepts = source.map ? listRelevantConcepts(source.map, conceptIds) : [];
  const claims = source.map ? listClaims(source.map, new Set(concepts.map((concept) => concept.id))) : [];
  const terms = listTerms(pack, source);

  const courseBlock = [`Course: ${source.title}`, source.tagline, source.summary]
    .filter((line) => line.length > 0)
    .join('\n');
  const conceptBlock = source.map ? renderConcepts(source.map, concepts) : '';
  const glossaryBlock = terms.map((term) => `- [[${term.id}]] ${term.term} — ${term.definition}`).join('\n');
  const claimBlock = claims.join('\n');
  const fixedCharacters = courseBlock.length + conceptBlock.length + glossaryBlock.length + claimBlock.length;
  const moduleText = buildModuleText(pack, sectionId, Math.max(0, MAXIMUM_CONTEXT_CHARACTERS - fixedCharacters));

  const parts: AskContextPart[] = [
    { name: 'course', characters: courseBlock.length, isTrimmed: false },
    { name: 'concepts', characters: conceptBlock.length, isTrimmed: concepts.length >= MAXIMUM_CONCEPTS },
    { name: 'glossary', characters: glossaryBlock.length, isTrimmed: terms.length >= MAXIMUM_TERMS },
    { name: 'claims', characters: claimBlock.length, isTrimmed: claims.length >= MAXIMUM_CLAIMS },
    { name: 'moduleText', characters: moduleText.text.length, isTrimmed: moduleText.isTrimmed }
  ];

  const prompt = [
    `<course>\n${courseBlock}\n</course>`,
    conceptBlock.length > 0 ? `<concept-map>\n${conceptBlock}\n</concept-map>` : '',
    glossaryBlock.length > 0 ? `<glossary>\n${glossaryBlock}\n</glossary>` : '',
    claimBlock.length > 0 ? `<research-claims>\n${claimBlock}\n</research-claims>` : '',
    `<module id="${pack.id}" title="${pack.title}">\n${moduleText.text}\n</module>`,
    `<selected-passage section="${section?.title ?? sectionId}">\n${shorten(quote, MAXIMUM_QUOTE_CHARACTERS)}\n</selected-passage>`,
    `<question>\n${shorten(question, MAXIMUM_QUESTION_CHARACTERS)}\n</question>`
  ]
    .filter((segment) => segment.length > 0)
    .join('\n\n');

  return {
    prompt,
    conceptIds: concepts.map((concept) => concept.id),
    termIds: terms.map((term) => term.id),
    parts,
    characters: prompt.length
  };
}
