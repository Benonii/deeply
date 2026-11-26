# The concept map

The map decides the course: what gets taught, in what order, and in how many modules. Build it in
nine steps rather than writing it out in one pass, because each step has its own failure and the
steps catch each other.

## The nine steps

1. **List candidates.** Pull every concept your research notes name. Test each one against the five
   rules below. Keep the ones that pass.
2. **Merge duplicates.** Compare one-line definitions, not names. "VDOM" and "virtual DOM" are one
   concept. Keep the term the maintainers use.
3. **Sort by role.** `core` if the goal needs it. `supporting` if a core concept needs it. `assumed`
   if this reader already has it and no module will teach it. Anything else is dropped, or becomes a
   jargon term with a glossary entry and no lesson.
4. **Draw edges.** For each concept, nominate up to three prerequisites, then test each pair
   directly: "can B be learned without A?" Answer with both definitions in front of you and no
   step-by-step reasoning, which measurably hurts here. An edge runs `from` the prerequisite `to`
   the concept that needs it.
5. **Prune.** If A needs B and B needs C, drop any direct A to C edge. Expect to cut several: this
   kind of judgement over-predicts edges, and a dense map forces a bad teaching order.
6. **Break cycles.** Split one concept of the cycle into an intro and an advanced concept, and let
   the intro come first. Never delete an edge you believe just to break a cycle.
7. **Order.** Every prerequisite before the concept that needs it. Start with whatever gives the
   simplest end-to-end picture of the whole topic.
8. **Group into modules.** At most 3 new concepts each, in order, no concept in two modules. Do not
   put two concepts that are easy to confuse back to back.
9. **Write objectives.** One per module: a verb, an object, and the context. `understand`, `know`,
   `learn`, `appreciate`, `be`, `grasp`, `comprehend` and `familiarize` are rejected in code,
   because none of them names something a reader can be seen doing. "Rewrite a nested loop as a
   comprehension, including its filter" works.

## The concept test

A concept belongs in the map only when all five hold:

1. It is one idea, named as a short noun phrase.
2. It can be taught in five to ten minutes.
3. One quiz question can check it.
4. It has a one-line definition.
5. At least one ranked source backs it.

Too big to teach in ten minutes: split it. Too small to need teaching: drop it from the map and mark
it as a jargon term in the lesson instead.

## How many modules

If the person asked for a number, hit it exactly: group the concepts into that many modules, and cut
scope so that no module carries more than 3 new concepts. Say what you cut.

Otherwise let the concepts decide, around 2 to 3 per module, and keep the course between 4 and 8
modules. A bigger map is a sign the goal is too broad.

## The shape

```json
{
  "schemaVersion": 2,
  "goal": { "text": "what the learner can do at the end", "conceptIds": ["the-last-core-concept"] },
  "concepts": [
    {
      "id": "list-comprehension",
      "name": "list comprehension",
      "definition": "An expression that builds a list by looping over an iterable in one line.",
      "role": "core",
      "sourceIds": ["py-tutorial-datastructures"]
    }
  ],
  "edges": [{ "from": "iterable", "to": "list-comprehension" }],
  "modules": [
    {
      "id": "comprehension-basics",
      "order": 1,
      "conceptIds": ["list-comprehension"],
      "objective": {
        "verb": "rewrite",
        "object": "a list-building for loop as a comprehension",
        "context": "including the loop's filter"
      }
    }
  ],
  "sources": []
}
```

`sources` is the array you sent to `submit_research`, unchanged. The claims in it are what every
lesson cites, so do not trim it.

A concept whose role is `assumed` is taught by no module and has no taught prerequisites. Its
definition and sources are still worth filling in; they cost nothing and tell the writer what the
reader is assumed to have.

## Fixing a rejection

`submit_concept_map` stores nothing unless every rule passes, and it does not count as an attempt.
The reply numbers the problems. Read the whole list before you change anything, because one real
mistake usually shows up as three complaints. These are the rules it enforces:

1. No prerequisite cycles.
2. Every prerequisite taught in an earlier module, or `assumed`.
3. At most 3 new concepts per module, exactly one module per concept.
4. Every non-assumed concept has a definition and at least one `sourceId` from your research.
5. Every concept reaches a goal concept through the edges. A dead end gets cut.
6. No banned objective verb.

When it stores, Deeply creates the course and one module row per plan, and tells you which module to
write first. Write them in that order: each brief lists the terms earlier modules taught, which only
exists once those modules are in.
