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

const log = (ctx: ActionCtx, courseId: Id<'courses'>, message: string, level: 'info' | 'warn' | 'error' = 'info') =>
  ctx.runMutation(internal.generate.state.log, { courseId, message, level });

async function loadContext(ctx: ActionCtx, id: Id<'_storage'> | undefined): Promise<RepoContext | null> {
  if (!id) return null;
  const blob = await ctx.storage.get(id);
  return blob ? (JSON.parse(await blob.text()) as RepoContext) : null;
}

function repoSummary(r: RepoContext): string {
  return [
    `${r.owner}/${r.name} @ ${r.sha} · ${r.stars} stars · languages: ${r.languages.join(', ')}`,
    r.description && `description: ${r.description}`,
    r.homepage && `homepage: ${r.homepage}`,
    `README (truncated):\n${r.readme.slice(0, 12_000)}`,
    `File tree (truncated):\n${r.tree.slice(0, 400).join('\n')}`,
    `Source files available to quote (choose module "files" only from these):\n${r.files.map((f) => `${f.path} (${f.text.split('\n').length} lines)`).join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/* ------------------------------------------------------------------ */
/* 1. Research + plan                                                  */
/* ------------------------------------------------------------------ */

export const plan = internalAction({
  args: { courseId: v.id('courses') },
  handler: async (ctx, { courseId }) => {
    const ok = await ctx.runMutation(internal.generate.state.beginPlanning, { courseId });
    if (!ok) return;
    const course = await ctx.runQuery(internal.generate.state.getCourse, { courseId });
    if (!course) return;
    try {
      let repo: RepoContext | null = null;
      let context: Id<'_storage'> | undefined;
      if (course.kind === 'repo' && course.repo) {
        await log(ctx, courseId, `Researching github.com/${course.repo.owner}/${course.repo.name}`);
        repo = await fetchRepoContext(course.repo.owner, course.repo.name, (m) => log(ctx, courseId, m));
        context = await ctx.storage.store(new Blob([JSON.stringify(repo)], { type: 'application/json' }));
      }

      await log(ctx, courseId, isFake() ? 'Planning (fake mode)' : 'Planning modules and visual identity with Claude');
      const planOut: PlanOutput = isFake()
        ? fakePlan(course.topic, course.kind, repo?.files.map((f) => f.path) ?? [])
        : (
            await generateJson({
              prompt: planPrompt({ topic: course.topic, kind: course.kind, repoSummary: repo ? repoSummary(repo) : undefined, brandDigest: repo?.brandDigest || undefined }),
              schema: PlanOutput,
              lint: lintPlan,
              maxTokens: 32000,
            })
          ).value;

      // Only keep files that exist in the research set.
      const known = new Set(repo?.files.map((f) => f.path) ?? []);
      const outlines = planOut.modules.map((m) => ({ ...m, files: m.files.filter((f) => known.has(f)) }));
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
      await ctx.runMutation(internal.generate.state.savePlan, {
        courseId,
        meta,
        outlines,
        context,
        repo: repo ? { owner: repo.owner, name: repo.name, sha: repo.sha } : undefined,
      });
    } catch (e) {
      const retryable = !(e instanceof RepoError) && !(e instanceof GenerationError && /declined|not set/.test(e.message));
      await ctx.runMutation(internal.generate.state.planFailed, { courseId, error: (e as Error).message.slice(0, 300), retryable });
    }
  },
});

/* ------------------------------------------------------------------ */
/* 2. Module writer                                                    */
/* ------------------------------------------------------------------ */

export const writeModule = internalAction({
  args: { courseId: v.id('courses'), n: v.number() },
  handler: async (ctx, { courseId, n }) => {
    const course = await ctx.runQuery(internal.generate.state.getCourse, { courseId });
    const mods = await ctx.runQuery(internal.generate.state.getModules, { courseId });
    const mod = mods.find((m) => m.n === n);
    if (!course || !mod || mod.status !== 'writing') return;
    const outline = mod.outline as ModuleOutline;
    try {
      await log(ctx, courseId, `Writing module ${n}: ${outline.title}`);
      const repo = await loadContext(ctx, course.context);
      const files: RepoFile[] = repo ? outline.files.map((p) => repo.files.find((f) => f.path === p)).filter((f): f is RepoFile => !!f) : [];

      let out: ModuleOutput;
      if (isFake()) {
        out = fakeModule(outline, n, files[0]);
      } else {
        const fileText = files.length ? files.map((f) => `=== ${f.path} ===\n${numbered(f)}`).join('\n\n') : undefined;
        out = (
          await generateJson({
            prompt: modulePrompt({
              courseTitle: course.meta?.title ?? course.topic,
              topic: course.topic,
              kind: course.kind,
              outline,
              n,
              allModules: mods.map((m) => ({ n: m.n, title: m.outline.title, summary: m.outline.summary })),
              files: fileText,
            }),
            schema: ModuleOutput,
            // Lint against the refs the model *claims*; unresolvable ones are stripped below.
            lint: (m) => lintModule(m, new Set(m.codeRefs.map((r) => r.id))),
          })
        ).value;
      }

      // Copy code verbatim from the fetched files; drop anything that doesn't resolve.
      const refs: Record<string, CodeRefPack> = {};
      let dropped = 0;
      if (repo) {
        for (const req of out.codeRefs) {
          const r = resolveRef(req, files, repo);
          if (r) refs[r.id] = r;
          else dropped++;
        }
      }
      const { codeRefs: _ignored, ...rest } = out;
      const pack: ModulePack = stripMissingRefs({ ...rest, n, id: outline.id }, new Set(Object.keys(refs)));
      const errs = lintModule(pack, new Set(Object.keys(refs)));
      if (errs.length) throw new GenerationError(errs.slice(0, 3).join('; '));
      await ctx.runMutation(internal.generate.state.moduleResult, { courseId, n, pack, codeRefs: repo ? refs : undefined, dropped });
    } catch (e) {
      await ctx.runMutation(internal.generate.state.moduleResult, { courseId, n, error: (e as Error).message.slice(0, 300) });
    }
  },
});

/** Remove node/edge code ids that point at refs we could not verify. */
function stripMissingRefs(m: ModulePack, ok: Set<string>): ModulePack {
  const keep = (ids?: string[]) => {
    const k = (ids ?? []).filter((id) => ok.has(id));
    return k.length ? k : undefined;
  };
  return {
    ...m,
    sections: m.sections.map((s) => ({
      ...s,
      blocks: s.blocks.map((b) =>
        b.type === 'flow'
          ? { ...b, nodes: b.nodes.map((nd) => ({ ...nd, code: keep(nd.code) })), edges: b.edges.map((ed) => ({ ...ed, code: keep(ed.code) })) }
          : b,
      ),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* 3. Challenges                                                       */
/* ------------------------------------------------------------------ */

export const writeChallenges = internalAction({
  args: { courseId: v.id('courses') },
  handler: async (ctx, { courseId }) => {
    const course = await ctx.runQuery(internal.generate.state.getCourse, { courseId });
    const mods = (await ctx.runQuery(internal.generate.state.getModules, { courseId })).filter((m) => m.status === 'ready');
    if (!course || course.challengesStatus !== 'writing') return;
    try {
      await log(ctx, courseId, 'Writing challenges');
      const out = isFake()
        ? fakeChallenges(mods.map((m) => ({ title: m.pack.title })))
        : (
            await generateJson({
              prompt: challengesPrompt({
                courseTitle: course.meta?.title ?? course.topic,
                modules: mods.map((m) => ({ n: m.n, title: m.pack.title, summary: m.pack.summary, keyFacts: keyFacts(m.pack as ModulePack) })),
              }),
              schema: ChallengesOutput,
              lint: (c) => c.challenges.filter((x) => x.answer >= x.options.length).map((x) => `${x.id}: answer out of range`),
              maxTokens: 32000,
            })
          ).value;
      await ctx.runMutation(internal.generate.state.challengesResult, { courseId, challenges: out.challenges });
    } catch (e) {
      await ctx.runMutation(internal.generate.state.challengesResult, { courseId, error: (e as Error).message.slice(0, 300) });
    }
  },
});

/** A compact digest of a module for the challenge writer: headings, callouts and checks. */
function keyFacts(m: ModulePack): string {
  const lines: string[] = [];
  for (const s of m.sections) {
    lines.push(`- ${s.title}`);
    for (const b of s.blocks) {
      if (b.type === 'callout') lines.push(`  · ${b.title ?? b.kind}: ${b.text.slice(0, 200)}`);
      if (b.type === 'check') lines.push(`  · Q: ${b.q} A: ${b.options[b.answer]}`);
    }
  }
  return lines.join('\n').slice(0, 3000);
}
