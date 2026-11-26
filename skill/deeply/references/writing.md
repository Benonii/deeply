# Writing a module

Start with `get_module_brief`. It gives you the objective, the concepts with every quote behind
them, the terms earlier modules taught, the concepts you may and may not name, the pack's JSON
schema, the current limits and the six check prompts. It comes from the running server, so where it
disagrees with this file, follow it.

## The shape of a lesson

In this order, because it is the order that teaches:

1. **A real case.** Open on a concrete snippet, a familiar failure, or a situation the reader has
   been in. Generalise afterwards, never before.
2. **The objective, in one line.** What the reader will be able to do. Not a topic heading.
3. **What they already have.** One sentence connecting this to the earlier module or to the assumed
   concepts, so the new idea lands on something.
4. **A worked example carried through.** Real values, real output, start to finish. Three to six
   named steps, and reuse those step names in later examples so the reader sees the shape repeat.
5. **The mistake.** Name the mistake people actually make here, say it is wrong, show the right
   model, and say why the wrong idea is tempting. A generic warning teaches nothing.
6. **Practice.** A quiz, a prediction, or an explain-back the reader has to produce.
7. **Where it is used.** One or two sentences on when to reach for this and when not to.

Write in direct second person. State why before what: the problem this solves, then the thing.
For anything with a runtime, state the simplified model you are using and what it leaves out.

## Length and density

- 150 to 300 words per concept chunk. 600 words per section is a hard cap in code.
- 1 to 3 new interacting ideas per section, never more than 4.
- Headings that state the point, not the topic. Emphasis sparingly. Cut tangents, history and
  asides, however interesting.
- Keep each explanation next to the code it explains, not a screen away.
- Examples should be realistic and idiomatic. No `foo`, no `bar`, no `Animal`/`Dog`. Vary the
  scenario across the course so the reader is not reading the same example six times.
- An analogy carries one property. Say where it stops being true, or leave it out.
- When you show wrong code, label it wrong before it appears, never after.

## Blocks

Build sections from these. `code`, `check` and `explainback` do the teaching work; the rest frame
it.

- `p`, `h3`, `list` for prose.
- `code` always carries `lang`. Add `runnable` (`python` or `javascript`) and `expectedOutput` for any
  block a reader should be able to run. `expectedOutput` is the exact stdout, and a check compares
  it to what the block really printed, so set it from a run and not from reading.
- `callout` with `kind` `warn` for the mistake, `insight` for a point worth pausing on, `analogy`
  with its limit stated, `rule` for something to remember, `deep` for an aside a reader can skip.
- `check` is one quiz: `q`, 3 to 5 `options`, `answer` as a 0-based index, `explain`, and `conceptId`.
- `explainback` is a prompt plus a `rubric` of 2 to 4 points a passing answer must make. One per
  module, on the module's hardest concept.
- `compare` is a table, for two things that differ along named dimensions.
- `keyterms` is a short terms block, worth it only when the reader is new to the whole area.
- `flow` is a diagram with at least 3 steps, for a process with real moving parts. Skip it otherwise.
- `video` and `article` are the media cards, below.

Give every section a stable kebab-case `id`; the checks report problems by section id.

## Terms

Any word that is not common English is jargon, however obvious it looks from inside the topic.

- Mark it `[[term-id]]` at its first appearance, or `[[term-id|as the sentence needs it]]` when the
  sentence needs another form.
- Give every id you mark a glossary entry: the canonical industry term and one plain sentence.
- A term an earlier module taught still gets marked. Repeat its glossary entry with `taughtIn` set
  to that module, and the reader gets a link back for a refresher.
- Define a term once, then use exactly that term for the rest of the course. Never drift to a
  synonym.
- Do not mark words inside code blocks, and do not mark plain English.

## Citations

`[^source-id]` goes at the end of any sentence that states a fact about the world: a default, a
version, a limit, a number, an API's behaviour, a "most X do Y". The id is a source id from the
concept map, never a URL. Instructions to the reader, definitions of your own terms, and sentences
about what the lesson does next are not factual sentences.

Cite the source whose quote actually says the thing. A real source cited for a sentence it does not
support fails the facts check just as hard as no source.

## Quizzes

- One concept per question, tagged with `conceptId`, and that concept is taught here or earlier.
- 3 or 4 options. Prefer "predict the output", "which line has the bug" and "which step is wrong"
  over definition recall.
- Every wrong option is a mistake a half-informed reader really makes: the opposite direction, the
  eager version of a lazy thing, the state before the operation instead of after, the behaviour of
  the neighbouring API. A filler option fails the quiz-quality check on its own, so write three real
  ones or cut an option.
- `explain` says why the right answer is right and why a tempting wrong answer is wrong, naming the
  misconception behind it. Never right-or-wrong alone.
- No "all of the above", no trick wording, no true/false, no giveaway from option length.
- Aim for questions the reader gets right about three times in four after reading. A question nobody
  can answer teaches nothing, and neither does one they could answer before reading.

## Code blocks

- A runnable block stands alone: no file it does not create, no network, no package the reader would
  have to install.
- Set `expectedOutput` to what the block printed when you ran it, including trailing newlines.
- Do not add prints to make the output look tidier than the code is.
- Keep blocks short. One idea per block, like one idea per section.

## Video and article cards

A module teaches better with one good video or page per concept. For each concept:

1. `find_videos` with the request id and the concept id, and one or two search queries. It returns
   the candidates that passed the hard filters with titles, descriptions, chapters and top comments.
2. Judge them: does this cover this exact concept, and do the comments say it made things click or
   that it is wrong or outdated. Pick the chapter that teaches the concept as your start and end.
3. `score_videos` with one judgement per video you would accept. Deeply scores them against the
   metrics it holds and hands back blocks. Paste those blocks into the section that teaches the
   concept.
4. `vet_articles` with the URLs you found, then `score_articles`, the same way.

Send ids and judgements only. Deeply holds the metrics and does the arithmetic.

If the finder reports that no key is configured, or that nothing passed the filters, write the module
without that card and move on. Never invent a video id, a title, a channel or a URL: the server
fetches every one of them when you submit, and an invented one fails the module.

Any markdown link you write in lesson text is probed too. Only link pages you actually opened.
