import { z } from 'zod';

import { CHECK_REGISTRY } from '../checks/registry';
import { MAX_RETRIES } from '../checks/runner';
import { CheckSubmission } from '../checks/submissionSchema';
import { loadThresholds } from '../checks/load/thresholds';
import { ModulePack } from '../lib/courseSchema';
import { MARK_SYNTAX } from './engineText';

import type { Concept, ConceptMap, ModulePlan, Source } from '../lib/conceptMapSchema';
import type { GlossaryTerm, ModulePack as ModulePackType } from '../lib/courseSchema';

const PACK_SCHEMA = JSON.stringify(z.toJSONSchema(ModulePack, { io: 'input', unrepresentable: 'any' }));

export const SUBMISSION_SCHEMA = JSON.stringify(
  z.toJSONSchema(CheckSubmission, { io: 'input', unrepresentable: 'any' })
);

export interface EarlierModule {
  plan: ModulePlan;
  pack: ModulePackType;
}

interface BriefInput {
  map: ConceptMap;
  plan: ModulePlan;
  earlierModules: EarlierModule[];
}

function describeSourceOfConcept(source: Source, conceptId: string): string[] {
  const claims = source.claims.filter((claim) => claim.conceptId === conceptId);
  return [
    `- ${source.id} (tier ${source.tier}) ${source.title} ${source.url}`,
    ...claims.map((claim) => `  claim: "${claim.quote}" ${claim.url}`)
  ];
}

function describeConcept(concept: Concept, map: ConceptMap): string[] {
  const sources = map.sources.filter((source) => concept.sourceIds.includes(source.id));
  const prerequisites = map.edges.filter((edge) => edge.to === concept.id).map((edge) => edge.from);
  return [
    `### ${concept.id} — ${concept.name} (${concept.role})`,
    `Definition to teach: ${concept.definition}`,
    ...(prerequisites.length > 0 ? [`Needs first: ${prerequisites.join(', ')}`] : []),
    ...sources.flatMap((source) => describeSourceOfConcept(source, concept.id))
  ];
}

function listEarlierTerms(earlierModules: EarlierModule[]): string[] {
  const lines: string[] = [];
  for (const earlier of earlierModules)
    for (const term of earlier.pack.glossary ?? [])
      lines.push(`- [[${term.id}]] ${term.term}: ${term.definition} (taughtIn: ${earlier.plan.id})`);
  return lines;
}

function listConceptNames(map: ConceptMap, conceptIds: string[]): string {
  return conceptIds
    .map((conceptId) => map.concepts.find((concept) => concept.id === conceptId)?.name ?? conceptId)
    .join(', ');
}

function listAgentChecks(): string[] {
  return CHECK_REGISTRY.filter(
    (registration) => registration.check.stage === 'agent' && registration.check.prompt !== undefined
  ).map(
    (registration) =>
      `### ${registration.check.checkId} (version ${registration.check.version}, mode ${registration.mode})\n\n${registration.check.prompt}`
  );
}

export function buildModuleBrief({ map, plan, earlierModules }: BriefInput): string {
  const taughtHere = plan.conceptIds
    .map((conceptId) => map.concepts.find((concept) => concept.id === conceptId))
    .filter((concept): concept is Concept => concept !== undefined);
  const assumed = map.concepts.filter((concept) => concept.role === 'assumed').map((concept) => concept.id);
  const taughtEarlier = earlierModules.flatMap((earlier) => earlier.plan.conceptIds);
  const laterConceptIds = map.modules
    .filter((candidate) => candidate.order > plan.order)
    .flatMap((candidate) => candidate.conceptIds);
  const earlierTerms = listEarlierTerms(earlierModules);
  return [
    `# Writing brief: module ${plan.id} (${plan.order} of ${map.modules.length})`,
    '',
    `Objective: ${plan.objective.verb} ${plan.objective.object}, ${plan.objective.context}.`,
    `Course goal: ${map.goal.text}`,
    '',
    '## Concepts this module teaches',
    `Set pack.conceptIds to exactly these, in this order: ${plan.conceptIds.join(', ')}`,
    '',
    ...taughtHere.flatMap((concept) => [...describeConcept(concept, map), '']),
    '## Concepts you may name in the text',
    `Taught earlier: ${taughtEarlier.length > 0 ? listConceptNames(map, taughtEarlier) : 'none'}`,
    `Assumed known, never taught: ${assumed.length > 0 ? listConceptNames(map, assumed) : 'none'}`,
    `Never name these, a later module teaches them: ${laterConceptIds.length > 0 ? listConceptNames(map, laterConceptIds) : 'none'}`,
    '',
    '## Terms taught earlier',
    ...(earlierTerms.length > 0
      ? [
          'Mark them again where they appear. Repeat the glossary entry with taughtIn set to the module named here, or leave it out and mark the id alone.',
          ...earlierTerms
        ]
      : ['None yet. Every term you mark must be in this module’s glossary.']),
    '',
    '## Marks',
    MARK_SYNTAX,
    '',
    '## Video and article cards',
    `A module teaches better with one good video or page per concept. For each concept above: call find_videos with this requestId and the conceptId, judge the candidates it returns, send your judgements to score_videos, and paste the blocks it hands back into the section that teaches that concept. Articles work the same way through vet_articles and score_articles. Send ids and judgements only; Deeply holds the metrics and does the scoring. Every link and video you paste is fetched again when you call submit_module, so a dead page fails the module.`,
    '',
    '## Limits code enforces',
    `- pack.id must be "${plan.id}" and pack.n must be ${plan.order}, matching the concept map.`,
    `- pack.schemaVersion must be 2.`,
    `- At most ${loadThresholds.maxNewConcepts} new concepts per module, at most ${loadThresholds.maxWordsPerSection} words per section.`,
    '- Every check block needs a conceptId from this module or an earlier one.',
    '- Every video block needs endSec greater than startSec, and every link must load.',
    `- ${MAX_RETRIES} rewrites are allowed. After that the module publishes with an unverified mark.`,
    '',
    '## The pack',
    'Send it as submit_module’s `pack`, matching this JSON Schema:',
    '',
    PACK_SCHEMA,
    '',
    '## The checks',
    'Run every check below before you call submit_module, and send the results together as `submission` in the same call. The order, load and links-and-videos checks run on the server; you do not answer those. A check you leave out fails, so answer all of them.',
    '',
    'submission must match this JSON Schema:',
    '',
    SUBMISSION_SCHEMA,
    '',
    ...listAgentChecks()
  ].join('\n');
}

export function listGlossaryTerms(earlierModules: EarlierModule[]): GlossaryTerm[] {
  return earlierModules.flatMap((earlier) =>
    (earlier.pack.glossary ?? []).map((term) => ({ ...term, taughtIn: term.taughtIn ?? earlier.plan.id }))
  );
}
