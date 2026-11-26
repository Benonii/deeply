---
name: deeply
description: Build a complete Deeply course on a topic through the Deeply course server, from research to a published URL, and finish builds that stopped partway. Use this whenever someone asks to make, build, generate or publish a Deeply course ("make me a Deeply course on X", "build me a course on Rust ownership", "I want to learn CRDTs deeply"), whenever they name a Deeply course request id, and whenever the deeply tools (start_course, submit_research, submit_concept_map, get_module_brief, submit_module, publish_course) are connected and the task is to teach a topic properly. Use it even for a casual ask like "make me a course on list comprehensions".
---

# Build a Deeply course

You are the curriculum engine. Deeply holds the data, enforces every structural rule in code, probes
links and videos, and renders the course. You do the parts that need a reader with a browser and a
shell: find the sources, shape the concept map, write the lessons, run the code, and answer the
checks that no server can answer for you.

Code validates everything you send, except the six checks you run yourself, which Deeply has to take
on trust. A claim with no source, a code block whose output you did not run, a quiz whose key you
never solved: each comes back as a fix note and costs you an attempt. Doing the work properly the
first time is the fast route.

## The run

One topic is one course request, and its id threads through every later call.

1. `start_course` with the topic, and the goal if the person gave one. Keep the request id.
2. **Research.** Plan queries, search, fetch pages in full, pull verbatim quotes, cross-check, then
   `submit_research`. See `references/research.md`.
3. **Concept map.** Nine steps from notes to a map, then `submit_concept_map`, fixing every lint
   error until it stores. See `references/concept-map.md`.
4. **Each module, in order.** `get_module_brief`, write the pack, add a video or article card per
   concept, run the six checks you own, then `submit_module` with the pack and the check results in
   one call. See `references/writing.md` and `references/checks.md`.
5. **Publish.** `submit_challenges` if the course earns a few course-wide questions, then
   `publish_course` with a title, tagline and summary. Give the person the URL it returns.

`course_status` tells you where a request stands at any point, including attempts per module and
which modules are unverified. Use it to pick up a build that stopped, instead of starting again.

The build is long, so say in one line what you are doing as each step starts, and what the step
found when it ends. The person is waiting on a URL, not on a running commentary.

## Never fake a result

Six of the nine checks run on your side. Deeply cannot see your shell, so it takes your word. That
is exactly why inventing a result is worthless: a module that passes on imagined output ships broken
code to the person who asked you for the course.

- `stdout` is what the interpreter printed, character for character. Never copy `expectedOutput`
  into it. A block you did not run goes unreported, and you take the failure.
- Answer each quiz from a copy with the answer key stripped out, before you look at the key. When
  your answer differs from the key, that disagreement is the finding: fix the key or the question.
- Score teaching quality as a stranger would. It can only flag, never block, so an honest 2 costs
  nothing and an inflated 5 throws away the only signal anyone gets.
- A page you could not open is not a source. Name what was unreachable and work with what you can
  reach.

If a module cannot be made to pass, let it publish unverified. That mark is accurate and useful. A
faked pass is neither.

## What the limits are

Code rejects these before anything is stored, so check them yourself first.

- At most 3 new concepts per module. Exactly one module teaches each concept.
- No prerequisite cycles, every prerequisite taught earlier or marked `assumed`, every concept
  reaching a goal concept, every taught concept defined and sourced.
- At most 600 words per section. `pack.schemaVersion` is 2, `pack.id` and `pack.n` match the plan.
- Every `[[term]]` mark resolves to a glossary entry, here or in an earlier module. Every
  `[^source-id]` resolves to a source in the map.
- Every quiz tags a concept this module or an earlier one teaches, and has 3 to 5 options.
- Three attempts per module. After the third it publishes with an unverified mark.

A rejection message lists the problems one per line. Fix all of them in one pass, then resubmit. A
schema or lint rejection stores nothing and does not spend an attempt.

## When sources are out of reach

Some environments block hosts, and some topics live behind logins or inside closed binaries.

- Blocked host: the same text is usually somewhere you can reach. Documentation sites are built
  from source files in a public repository, and tools ship their own docs on the machine you are
  already on. `references/research.md` has the order to try them in. Tell the person which hosts
  refused, once, at the end of research, and never route around a proxy or a block.
- Your own logins: pages you can already open are fair game. Nothing here is for getting past
  paywalls or bot walls.
- Closed software, native binaries, or a protocol with no public spec: a reverse-engineering tool
  run locally can produce evidence you then treat as a tier 1 source for how that product behaves.
  Reach for it only when public sources fall short, and never let the course depend on it.

Stop and say so only when the course's own concepts cannot be grounded in anything you actually
read, after working down that list. Fewer sources than you wanted is a course with a narrower scope
and a note about what was missing, not a reason to abandon the build.

## Reference files

Read each one as you reach its step, not upfront.

- `references/research.md` covers the query plan, tiers, quotes, cross-checking and the stop rule.
- `references/concept-map.md` covers the nine steps, the concept test and the map's shape.
- `references/writing.md` covers lesson shape, blocks, terms, quizzes, and video and article cards.
- `references/checks.md` covers how to run the six checks you own and how to use a fix note.
- `scripts/pack.py` runs a pack's code blocks and prints its quizzes with the keys stripped.

The module brief that `get_module_brief` returns carries the live pack schema, the submission schema,
the current limits and the six check prompts. It is generated from the running server, so when it
disagrees with anything here, follow the brief.
