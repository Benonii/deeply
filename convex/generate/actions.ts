import { v } from 'convex/values';
import { internalAction, type ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { lintModule, type CodeRefPack, type ModulePack } from '../lib/courseSchema';
import { fetchRepoContext, numbered, RepoError, resolveRef, type RepoContext, type RepoFile } from './github';
import { GenerationError, generateJson } from './llm';
import { fakeChallenges, fakeModule, fakePlan, isFake } from './fake';
import { challengesPrompt, modulePrompt, planPrompt } from './prompts';
import { ChallengesOutput, lintPlan, ModuleOutput, PlanOutput, type ModuleOutline } from './shapes';

const log = (context: ActionCtx, courseId: Id<'courses'>, message: string, level: 'info' | 'warn' | 'error' = 'info') =>
  context.runMutation(internal.generate.state.log, { courseId, message, level });

async function loadContext(context: ActionCtx, id: Id<'_storage'> | undefined): Promise<RepoContext | null> {
  if (!id) return null;
  const blob = await context.storage.get(id);
  return blob ? (JSON.parse(await blob.text()) as RepoContext) : null;
}

function repoSummary(repo: RepoContext): string {
  return [
    `${repo.owner}/${repo.name} @ ${repo.sha} · ${repo.stars} stars · languages: ${repo.languages.join(', ')}`,
    repo.description && `description: ${repo.description}`,
    repo.homepage && `homepage: ${repo.homepage}`,
    `README (truncated):\n${repo.readme.slice(0, 12_000)}`,
    `File tree (truncated):\n${repo.tree.slice(0, 400).join('\n')}`,
    `Source files available to quote (choose module "files" only from these):\n${repo.files.map((file) => `${file.path} (${file.text.split('\n').length} lines)`).join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}


export const plan = internalAction({
  args: { courseId: v.id('courses') },
  handler: async (actionContext, { courseId }) => {
    const ok = await actionContext.runMutation(internal.generate.state.beginPlanning, { courseId });
    if (!ok) return;
    const course = await actionContext.runQuery(internal.generate.state.getCourse, { courseId });
    if (!course) return;
    try {
      let repo: RepoContext | null = null;
      let context: Id<'_storage'> | undefined;
      if (course.kind === 'repo' && course.repo) {
        await log(actionContext, courseId, `Researching github.com/${course.repo.owner}/${course.repo.name}`);
        repo = await fetchRepoContext(course.repo.owner, course.repo.name, (message) => log(actionContext, courseId, message));
        context = await actionContext.storage.store(new Blob([JSON.stringify(repo)], { type: 'application/json' }));
      }

      await log(actionContext, courseId, isFake() ? 'Planning (fake mode)' : 'Planning modules and visual identity with Claude');
      const planOut: PlanOutput = isFake()
        ? fakePlan(course.topic, course.kind, repo?.files.map((file) => file.path) ?? [])
        : (
            await generateJson({
              prompt: planPrompt({ topic: course.topic, kind: course.kind, repoSummary: repo ? repoSummary(repo) : undefined, brandDigest: repo?.brandDigest || undefined }),
              schema: PlanOutput,
              lint: lintPlan,
              maxTokens: 32000,
            })
          ).value;

      const known = new Set(repo?.files.map((file) => file.path) ?? []);
      const outlines = planOut.modules.map((plannedModule) => ({ ...plannedModule, files: plannedModule.files.filter((filePath) => known.has(filePath)) }));
      const meta = {
        id: course.slug,
        title: planOut.meta.title,
        tagline: planOut.meta.tagline,
        summary: planOut.meta.summary,
        kind: course.kind,
        brand: planOut.brand,
        challenges: [],
        codeRefs: {},
      };
      await actionContext.runMutation(internal.generate.state.savePlan, {
        courseId,
        meta,
        outlines,
        context,
        repo: repo ? { owner: repo.owner, name: repo.name, sha: repo.sha } : undefined,
      });
    } catch (error) {
      const retryable = !(error instanceof RepoError) && !(error instanceof GenerationError && /declined|not set/.test(error.message));
      await actionContext.runMutation(internal.generate.state.planFailed, { courseId, error: (error as Error).message.slice(0, 300), retryable });
    }
  },
});


export const writeModule = internalAction({
  args: { courseId: v.id('courses'), n: v.number() },
  handler: async (actionContext, { courseId, n: moduleNumber }) => {
    const course = await actionContext.runQuery(internal.generate.state.getCourse, { courseId });
    const courseModules = await actionContext.runQuery(internal.generate.state.getModules, { courseId });
    const courseModule = courseModules.find((courseModule) => courseModule.n === moduleNumber);
    if (!course || !courseModule || courseModule.status !== 'writing') return;
    const outline = courseModule.outline as ModuleOutline;
    try {
      await log(actionContext, courseId, `Writing module ${moduleNumber}: ${outline.title}`);
      const repo = await loadContext(actionContext, course.context);
      const files: RepoFile[] = repo ? outline.files.map((filePath) => repo.files.find((file) => file.path === filePath)).filter((file): file is RepoFile => !!file) : [];

      let out: ModuleOutput;
      if (isFake()) {
        out = fakeModule(outline, moduleNumber, files[0]);
      } else {
        const fileText = files.length ? files.map((file) => `=== ${file.path} ===\n${numbered(file)}`).join('\n\n') : undefined;
        out = (
          await generateJson({
            prompt: modulePrompt({
              courseTitle: course.meta?.title ?? course.topic,
              topic: course.topic,
              kind: course.kind,
              outline,
              n: moduleNumber,
              allModules: courseModules.map((courseModule) => ({ n: courseModule.n, title: courseModule.outline.title, summary: courseModule.outline.summary })),
              files: fileText,
            }),
            schema: ModuleOutput,
            lint: (pack) => lintModule(pack, new Set(pack.codeRefs.map((codeRef) => codeRef.id))),
          })
        ).value;
      }

      const refs: Record<string, CodeRefPack> = {};
      let dropped = 0;
      if (repo) {
        for (const request of out.codeRefs) {
          const resolved = resolveRef(request, files, repo);
          if (resolved) refs[resolved.id] = resolved;
          else dropped++;
        }
      }
      const { codeRefs: _ignored, ...rest } = out;
      const pack: ModulePack = stripMissingRefs({ ...rest, n: moduleNumber, id: outline.id }, new Set(Object.keys(refs)));
      const errs = lintModule(pack, new Set(Object.keys(refs)));
      if (errs.length) throw new GenerationError(errs.slice(0, 3).join('; '));
      await actionContext.runMutation(internal.generate.state.moduleResult, { courseId, n: moduleNumber, pack, codeRefs: repo ? refs : undefined, dropped });
    } catch (error) {
      await actionContext.runMutation(internal.generate.state.moduleResult, { courseId, n: moduleNumber, error: (error as Error).message.slice(0, 300) });
    }
  },
});

function stripMissingRefs(pack: ModulePack, ok: Set<string>): ModulePack {
  const keep = (ids?: string[]) => {
    const keptIDs = (ids ?? []).filter((id) => ok.has(id));
    return keptIDs.length ? keptIDs : undefined;
  };
  return {
    ...pack,
    sections: pack.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) =>
        block.type === 'flow'
          ? { ...block, nodes: block.nodes.map((node) => ({ ...node, code: keep(node.code) })), edges: block.edges.map((edge) => ({ ...edge, code: keep(edge.code) })) }
          : block,
      ),
    })),
  };
}


export const writeChallenges = internalAction({
  args: { courseId: v.id('courses') },
  handler: async (actionContext, { courseId }) => {
    const course = await actionContext.runQuery(internal.generate.state.getCourse, { courseId });
    const courseModules = (await actionContext.runQuery(internal.generate.state.getModules, { courseId })).filter((courseModule) => courseModule.status === 'ready');
    if (!course || course.challengesStatus !== 'writing') return;
    try {
      await log(actionContext, courseId, 'Writing challenges');
      const out = isFake()
        ? fakeChallenges(courseModules.map((courseModule) => ({ title: courseModule.pack.title })))
        : (
            await generateJson({
              prompt: challengesPrompt({
                courseTitle: course.meta?.title ?? course.topic,
                modules: courseModules.map((courseModule) => ({ n: courseModule.n, title: courseModule.pack.title, summary: courseModule.pack.summary, keyFacts: keyFacts(courseModule.pack as ModulePack) })),
              }),
              schema: ChallengesOutput,
              lint: (challengeSet) => challengeSet.challenges.filter((challenge) => challenge.answer >= challenge.options.length).map((challenge) => `${challenge.id}: answer out of range`),
              maxTokens: 32000,
            })
          ).value;
      await actionContext.runMutation(internal.generate.state.challengesResult, { courseId, challenges: out.challenges });
    } catch (error) {
      await actionContext.runMutation(internal.generate.state.challengesResult, { courseId, error: (error as Error).message.slice(0, 300) });
    }
  },
});

function keyFacts(pack: ModulePack): string {
  const lines: string[] = [];
  for (const section of pack.sections) {
    lines.push(`- ${section.title}`);
    for (const block of section.blocks) {
      if (block.type === 'callout') lines.push(`  · ${block.title ?? block.kind}: ${block.text.slice(0, 200)}`);
      if (block.type === 'check') lines.push(`  · Q: ${block.q} A: ${block.options[block.answer]}`);
    }
  }
  return lines.join('\n').slice(0, 3000);
}
