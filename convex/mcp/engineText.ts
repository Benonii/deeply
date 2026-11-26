import { MAX_NEW_CONCEPTS_PER_MODULE } from '../lib/conceptMapLint';
import { BANNED_OBJECTIVE_VERBS } from '../lib/conceptMapSchema';

export const CONCEPT_MAP_RULES = `A concept map is one JSON object:

{
  "schemaVersion": 2,
  "goal": { "text": "what the learner can do at the end", "conceptIds": ["..."] },
  "concepts": [{ "id": "kebab-case", "name": "short noun phrase", "definition": "one line", "role": "core | supporting | assumed", "sourceIds": ["..."] }],
  "edges": [{ "from": "the prerequisite", "to": "the concept that needs it" }],
  "modules": [{ "id": "kebab-case", "order": 1, "conceptIds": ["new concepts, in teaching order"], "objective": { "verb": "one action verb", "object": "what the learner acts on", "context": "the situation" } }],
  "sources": [ the sources you sent to submit_research, unchanged ]
}

Build it in nine steps: list candidate concepts, merge duplicates, sort each one into core, supporting or assumed, draw prerequisite edges, prune edges implied by another path, break cycles by splitting a concept, order so every prerequisite comes first, group into modules of at most ${MAX_NEW_CONCEPTS_PER_MODULE} new concepts, then write one objective per module.

A concept belongs in the map only if all five hold: it is one idea named as a short noun phrase, it is teachable in five to ten minutes, one quiz question can check it, it has a one-line definition, and at least one source backs it. Too big to teach in ten minutes means split it. Too small to need teaching means drop it and mark it as jargon in the lesson instead.

Code rejects a map that breaks any of these, so check them before you send it:
1. No prerequisite cycles. Break one by splitting a concept into an intro and an advanced concept.
2. Every prerequisite is taught in an earlier module, or its role is "assumed". Assumed concepts are taught by no module and have no taught prerequisites.
3. No module teaches more than ${MAX_NEW_CONCEPTS_PER_MODULE} new concepts. Exactly one module teaches each concept.
4. Every concept that is not assumed has a one-line definition and at least one sourceId from your research.
5. Every concept leads to a goal concept through the edges. Cut a concept that leads nowhere.
6. No objective verb from this list, because none of them names an observable action: ${BANNED_OBJECTIVE_VERBS.join(', ')}.`;

export const MARK_SYNTAX = `[[term-id]] marks a word as jargon, and [[term-id|words as written]] marks it when the sentence needs another form. Every id must be in this module's glossary, or in the glossary of an earlier module. A term an earlier module taught is still marked, with a glossary entry whose taughtIn names that module, so the reader gets a link back.

[^source-id] after a factual sentence cites one source of the concept map. The id is a source id, never a URL. A sentence that states a fact about the world needs one.`;

export function describeSourceTiers(tiers: number[]): string {
  const counted = new Map<number, number>();
  for (const tier of tiers) counted.set(tier, (counted.get(tier) ?? 0) + 1);
  return [...counted.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([tier, count]) => `tier ${tier}: ${count}`)
    .join(', ');
}

export function numberProblems(problems: string[]): string {
  return problems.map((problem, index) => `${index + 1}. ${problem}`).join('\n');
}
