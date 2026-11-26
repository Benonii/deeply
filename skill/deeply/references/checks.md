# Running the checks

Nine checks run on every module. Three need no answer from you: order and load are pure code, and
links-and-videos probes the network from the server. The other six are yours, and `submit_module`
takes the pack and all six answers in one call. So run them before you submit, not after.

The brief carries each check's own prompt and the exact JSON shape of the submission. What follows
is how to do the work so the answers are real.

Write the pack to a file first, say `module-1.json`. Everything below reads that file, and the file
is what you send.

## 1. code-runs

```sh
python3 <this skill folder>/scripts/pack.py code module-1.json
```

It finds the runnable blocks in order, runs each one in a fresh temporary directory with the
matching interpreter, and prints the `codeRuns` array ready to paste into the submission. Trust its
output over your reading of the code: that is the whole point of the check.

A block that raises is reported with its error, not dropped. If the script reports an error you did
not expect, the lesson is wrong, so fix the code or fix the `expectedOutput`.

Running the blocks yourself is fine too. Write each block's `code` to a file with no edits, run it
from a clean directory, capture stdout verbatim, and number the blocks from 1 in the order they
appear across sections, counting only blocks that have a `runnable` field.

## 2. answer-keys

```sh
python3 <this skill folder>/scripts/pack.py quiz module-1.json
```

This prints every quiz with its options and without its `answer` or `explain`. Answer from that
printout and from the lesson text, then record what you picked as a 0-based index.

Answering from the stripped copy is what makes this check mean anything. You wrote the key minutes
ago, so reading it first turns the check into a copy. Work each question out as the reader would.

When your answer and the key disagree, something is wrong with the module, not with you. Either the
key is wrong or the question has two defensible answers. Fix the question, not the submission.

## 3. facts-cited

Read the module once, listing every sentence that states a fact about the world. For each one:

- Copy the sentence verbatim from the pack, with its `[[term]]` and `[^source]` marks left in. Code
  looks for it in the lesson text, so a paraphrase fails.
- Open the cited source's claim in the map and read its quote.
- `supported` when the quote states the sentence, or the sentence follows with no extra step.
  `unsupported` when the quote says something else, weaker, or opposite. `unclear` when the quote is
  about the right thing but does not settle it.
- Add a `note` naming what the source actually says for anything that is not supported.

A factual sentence with no citation still goes on the list. Code will fail it, which is the point:
cite it or cut the claim.

## 4. jargon

Read the module start to finish as a cold reader: strong at programming in general, new to this
topic. Then go back and list every word that reader would not already know, with the section id you
met it in. Include terms of art however obvious they look, narrow uses of ordinary words,
abbreviations at first use, and library or protocol names used as if the reader knew them.

List a word even when you can see it is already marked. Code decides; you only report. Over-listing
is free, and a missed word is a reader who gets stuck.

## 5. quiz-quality

For each quiz, judge the wrong options only. Would someone who half-understands this topic pick
this one? One filler option, one joke, one obvious absurdity, one near-duplicate of another option,
and the answer is false with a note naming it. Whether the key is right belongs to check 2.

## 6. teaching-quality

Score five criteria 1 to 5: `objectiveStated`, `workedExample`, `practice`, `mistakeAddressed`,
`levelFits`. 5 means a strong teacher would change nothing, 3 means it is there but thin, 1 means it
is missing. Write a `note` whenever a score is below 3.

This check flags and never blocks, so there is no reason to inflate it, and every reason not to: the
score is the only read anyone gets on whether the course teaches.

## Reading a failure

A failing submit stores nothing and spends one of three attempts. The reply names each failing check
and a fix note that points at a specific block, quiz or sentence.

- Change only what the notes name. A rewrite of a passing section earns new problems for nothing.
- Re-run the code check if you touched any runnable block, and remember that adding or removing one
  renumbers every block after it.
- Re-answer the quizzes you changed from a freshly stripped copy.
- Send a complete submission every time. A check you leave out fails.

After the third attempt the module stores with an unverified mark and the course can still publish.
Take that outcome over a faked pass, and tell the person which modules carry the mark and why.

Two checks run in shadow mode right now, facts-cited and jargon, so their failures cannot block a
module. Answer them exactly as carefully: their results are stored, they are what tunes the checks,
and they will block soon enough.
