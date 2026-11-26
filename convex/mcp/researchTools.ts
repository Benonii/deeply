import { z } from 'zod';

import { internal } from '../_generated/api';
import { lintConceptMap } from '../lib/conceptMapLint';
import { ConceptMap } from '../lib/conceptMapSchema';
import { UNKNOWN_REQUEST } from './engineState';
import { CONCEPT_MAP_RULES, describeSourceTiers, numberProblems } from './engineText';
import { defineAgentTool } from './server';
import { submitConceptMapInput, submitResearchInput } from './validators';

import type { ConceptMap as ConceptMapType, ModulePlan } from '../lib/conceptMapSchema';
import type { AgentTool } from './types';

function titleizeModuleId(moduleId: string): string {
  const words = moduleId.split('-');
  return [words[0].charAt(0).toUpperCase() + words[0].slice(1), ...words.slice(1)].join(' ');
}

function toModuleOutline(plan: ModulePlan) {
  return {
    id: plan.id,
    n: plan.order,
    title: titleizeModuleId(plan.id),
    summary: `${plan.objective.verb} ${plan.objective.object}, ${plan.objective.context}.`
  };
}

function summarizeMap(map: ConceptMapType): string[] {
  const byRole = (role: string) => map.concepts.filter((concept) => concept.role === role).length;
  return [
    `${map.concepts.length} concepts (${byRole('core')} core, ${byRole('supporting')} supporting, ${byRole('assumed')} assumed), ${map.edges.length} edges, ${map.sources.length} sources.`,
    'Modules in order:',
    ...[...map.modules]
      .sort((left, right) => left.order - right.order)
      .map((plan) => `  ${plan.order}. ${plan.id} teaches ${plan.conceptIds.join(', ')}`)
  ];
}

const submitResearch = defineAgentTool({
  name: 'submit_research',
  title: 'Submit research for a course',
  description:
    'Send every source you read, with a verbatim quote and a URL for each claim you plan to teach. Call it once the reading is done, before the concept map.',
  inputSchema: submitResearchInput,
  run: async ({ requestId, sources }, context) => {
    const duplicates = sources
      .map((source) => source.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index)
      .join(', ');
    if (duplicates.length > 0)
      return { status: 'failed', message: `Two sources share an id: ${duplicates}. Give every source its own id.` };
    const saved = await context.actionContext.runMutation(internal.courseBuilds.saveResearch, {
      ownerId: context.userId,
      requestId,
      sources
    });
    if (saved.status === 'unknownRequest') return { status: 'failed', message: UNKNOWN_REQUEST };
    if (saved.status === 'wrongStage')
      return {
        status: 'failed',
        message: `This request is at the ${saved.stage} stage, so research is no longer the step. Call course_status to see what is next.`
      };
    const claims = sources.flatMap((source) => source.claims);
    const conceptIds = [...new Set(claims.map((claim) => claim.conceptId))].sort();
    return {
      status: 'ok',
      text: [
        `Research stored: ${sources.length} sources, ${claims.length} claims (${describeSourceTiers(sources.map((source) => source.tier))}).`,
        `Concepts your claims name: ${conceptIds.length > 0 ? conceptIds.join(', ') : 'none yet'}.`,
        '',
        'Next: build the concept map and send it with submit_concept_map.',
        '',
        CONCEPT_MAP_RULES
      ].join('\n')
    };
  }
});

const submitConceptMap = defineAgentTool({
  name: 'submit_concept_map',
  title: 'Submit the concept map',
  description:
    'Send the concept map: goal, concepts with definitions and sources, prerequisite edges, and the module plan. Code checks every rule and creates the course when it passes.',
  inputSchema: submitConceptMapInput,
  run: async ({ requestId, map }, context) => {
    const parsed = ConceptMap.safeParse(map);
    if (!parsed.success)
      return {
        status: 'failed',
        message: `The concept map does not match the schema. Nothing was stored.\n\n${z.prettifyError(parsed.error)}\n\n${CONCEPT_MAP_RULES}`
      };
    const problems = lintConceptMap(parsed.data);
    if (problems.length > 0)
      return {
        status: 'failed',
        message: [
          `The concept map breaks ${problems.length} ${problems.length === 1 ? 'rule' : 'rules'}. Nothing was stored. Fix all of them and call submit_concept_map again.`,
          '',
          numberProblems(problems),
          '',
          CONCEPT_MAP_RULES
        ].join('\n')
      };
    const saved = await context.actionContext.runMutation(internal.courseBuilds.saveMap, {
      ownerId: context.userId,
      requestId,
      map: parsed.data,
      moduleOutlines: [...parsed.data.modules].sort((left, right) => left.order - right.order).map(toModuleOutline)
    });
    if (saved.status === 'unknownRequest') return { status: 'failed', message: UNKNOWN_REQUEST };
    if (saved.status === 'wrongStage')
      return {
        status: 'failed',
        message:
          saved.stage === 'queued'
            ? 'No research for this request yet. Call submit_research first.'
            : `This request is at the ${saved.stage} stage, so the concept map is already in and cannot be replaced. Call course_status to see what is next.`
      };
    const first = [...parsed.data.modules].sort((left, right) => left.order - right.order)[0];
    return {
      status: 'ok',
      text: [
        `Concept map stored. Course ${saved.slug} created, unlisted, with one module row per plan.`,
        ...summarizeMap(parsed.data),
        '',
        `Next: call get_module_brief for module ${first.id}, write it, then send it with submit_module.`
      ].join('\n')
    };
  }
});

export const RESEARCH_TOOLS: readonly AgentTool[] = [submitResearch, submitConceptMap];
