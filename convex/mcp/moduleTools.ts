import { z } from 'zod';

import { internal } from '../_generated/api';
import { CheckSubmission } from '../checks/submissionSchema';
import { MAX_RETRIES } from '../checks/runner';
import { ModulePack } from '../lib/courseSchema';
import { lintLessonV2 } from '../lib/lessonLint';
import { describeResults, describeVerdict, listProblems } from './checkReport';
import { listEarlierModules, readMappedState } from './engineState';
import { numberProblems } from './engineText';
import { buildModuleBrief, listGlossaryTerms } from './moduleBrief';
import { defineAgentTool } from './server';
import { getModuleBriefInput, submitModuleInput } from './validators';

import type { ConceptMap, ModulePlan } from '../lib/conceptMapSchema';
import type { CourseModuleView } from '../lib/types';
import type { AgentTool, AgentToolResult } from './types';

function describeAttempt(attempt: number): string {
  const allowed = MAX_RETRIES + 1;
  return attempt <= allowed
    ? `attempt ${attempt} of ${allowed}`
    : `attempt ${attempt}, past the ${allowed} the policy allows`;
}

function findPlan(map: ConceptMap, moduleId: string): ModulePlan | undefined {
  return map.modules.find((plan) => plan.id === moduleId);
}

function describeUnknownModule(map: ConceptMap, moduleId: string): string {
  const known = [...map.modules]
    .sort((left, right) => left.order - right.order)
    .map((plan) => `${plan.order}. ${plan.id}`)
    .join('\n');
  return `The concept map has no module "${moduleId}". Its modules are:\n${known}`;
}

function describeNextModule(modules: CourseModuleView[]): string {
  const waiting = modules.find((courseModule) => courseModule.status !== 'ready');
  if (!waiting) return 'Every module is ready. Next: call publish_course with the title, tagline and summary.';
  return `Next: call get_module_brief for module ${waiting.id}.`;
}

const getModuleBrief = defineAgentTool({
  name: 'get_module_brief',
  title: 'Get the brief for one module',
  description:
    'Everything needed to write one module and pass its checks first time: its objective, the concepts with their sources and quotes, the terms earlier modules taught, the pack schema, the limits, and every check you must answer.',
  inputSchema: getModuleBriefInput,
  run: async ({ requestId, moduleId }, context) => {
    const loaded = await readMappedState(context, requestId);
    if (loaded.kind === 'failed') return { status: 'failed', message: loaded.message };
    const plan = findPlan(loaded.map, moduleId);
    if (!plan) return { status: 'failed', message: describeUnknownModule(loaded.map, moduleId) };
    const earlierModules = await listEarlierModules(context, requestId, loaded.map, plan.order);
    return { status: 'ok', text: buildModuleBrief({ map: loaded.map, plan, earlierModules }) };
  }
});

const submitModule = defineAgentTool({
  name: 'submit_module',
  title: 'Submit one written module',
  description:
    'Send one written module with your results for every check. Code lints it against the concept map, runs the server checks, and stores it only when it passes. A failure comes back as fix notes.',
  inputSchema: submitModuleInput,
  run: async ({ requestId, moduleId, pack, submission, attempt }, context): Promise<AgentToolResult> => {
    const loaded = await readMappedState(context, requestId);
    if (loaded.kind === 'failed') return { status: 'failed', message: loaded.message };
    const { map } = loaded;
    const plan = findPlan(map, moduleId);
    if (!plan) return { status: 'failed', message: describeUnknownModule(map, moduleId) };

    const parsedPack = ModulePack.safeParse(pack);
    if (!parsedPack.success)
      return {
        status: 'failed',
        message: `The pack does not match the ModulePack schema. Nothing was stored.\n\n${z.prettifyError(parsedPack.error)}\n\nCall get_module_brief for the schema.`
      };
    if (parsedPack.data.id !== moduleId)
      return {
        status: 'failed',
        message: `The pack id is "${parsedPack.data.id}" but you submitted it as module "${moduleId}". Nothing was stored.`
      };
    const parsedSubmission = CheckSubmission.safeParse(submission);
    if (!parsedSubmission.success)
      return {
        status: 'failed',
        message: `The check submission does not match the CheckSubmission schema. Nothing was stored.\n\n${z.prettifyError(parsedSubmission.error)}`
      };

    const earlierModules = await listEarlierModules(context, requestId, map, plan.order);
    const termsTaughtEarlier = listGlossaryTerms(earlierModules);
    const lintProblems = lintLessonV2(parsedPack.data, map, {
      termIdsTaughtEarlier: new Set(termsTaughtEarlier.map((term) => term.id))
    });
    if (lintProblems.length > 0)
      return {
        status: 'failed',
        message: [
          `The module breaks ${lintProblems.length} lesson ${lintProblems.length === 1 ? 'rule' : 'rules'}. Nothing was stored and this does not count as an attempt.`,
          '',
          numberProblems(lintProblems)
        ].join('\n')
      };

    const begun = await context.actionContext.runMutation(internal.courseModuleRuns.beginAttempt, {
      ownerId: context.userId,
      requestId,
      moduleId
    });
    if (begun.status === 'wrongStage')
      return { status: 'failed', message: 'This course is published. Start a new request to change it.' };
    if (begun.status !== 'begun')
      return { status: 'failed', message: 'This request has no module row to write to. Call course_status.' };

    const run = await context.actionContext.runAction(internal.checks.actions.runModuleChecks, {
      request: {
        pack: parsedPack.data,
        map,
        termsTaughtEarlier,
        submission: parsedSubmission.data,
        attempt: begun.attempt
      }
    });
    if (run.data === null) return { status: 'failed', message: run.message };
    const { results, verdict } = run.data;

    const finished = await context.actionContext.runMutation(internal.courseModuleRuns.finishAttempt, {
      ownerId: context.userId,
      requestId,
      moduleId,
      attempt: begun.attempt,
      fate: verdict.kind,
      ...(verdict.kind === 'retry' ? {} : { pack: parsedPack.data }),
      results: results.map((result) => ({
        checkId: result.checkId,
        version: result.version,
        mode: result.mode,
        pass: result.pass,
        problems: result.problems,
        fixNote: result.fixNote
      }))
    });
    if (finished.status !== 'stored')
      return { status: 'failed', message: 'The checks ran but the result could not be stored. Call course_status.' };

    const attemptNote =
      attempt !== undefined && attempt !== begun.attempt
        ? [`You called this attempt ${attempt}. The server counts it as attempt ${begun.attempt}.`]
        : [];
    const rewritesLeft = MAX_RETRIES + 1 - begun.attempt;
    const problems = listProblems(results);
    return {
      status: 'ok',
      text: [
        `Checks on module ${moduleId}, ${describeAttempt(begun.attempt)}:`,
        ...describeResults(results),
        '',
        ...describeVerdict(verdict, moduleId, begun.attempt),
        ...(verdict.kind === 'retry'
          ? ['', `${rewritesLeft} ${rewritesLeft === 1 ? 'rewrite' : 'rewrites'} left before it publishes unverified.`]
          : []),
        ...(problems.length > 0 ? ['', 'What the checks found:', ...problems.map((problem) => `- ${problem}`)] : []),
        ...attemptNote,
        '',
        describeNextModule(finished.modules)
      ].join('\n')
    };
  }
});

export const MODULE_TOOLS: readonly AgentTool[] = [getModuleBrief, submitModule];
