# Research

The goal is a set of sources with verbatim quotes you can stand behind, one per claim you plan to
teach. Everything later in the build cites these, so a weak source pack produces a weak course that
fails its own checks.

## 1. Write the query plan first

Write 8 to 15 queries before you search anything, covering these intents:

- what the thing is, in one line
- the official documentation or reference
- the specification, RFC, standard or source code
- how it works underneath
- a strong tutorial or explanation by a known educator
- the mistakes people make with it, and the surprises
- the version, release or dialect that matters here

Name the technology exactly as its maintainers write it. Add the version when behaviour changed
across versions.

## 2. Search, then fetch in full

Run the queries with your search tool and keep the strongest few results per query. Then open each
promising page and read the whole thing.

A search snippet is never a source. It is truncated, often rewritten, and quoting it produces a
quote that does not exist on the page.

### When a page will not load

A refused host is rarely the end of the road, because the same text usually lives somewhere else.
Work down this list before you give up on a source:

1. **The project's own repository.** Documentation sites are built from source files in a public
   repo, and the raw file usually fetches when the rendered site does not. The language reference,
   the tutorial, the specs and the change notes are all in there. It is the same text, so it is
   still tier 1. Fetch the raw file over plain HTTPS; a repository API can be restricted while raw
   file access is not.
2. **What is installed on this machine.** The tool you are teaching often ships its own
   documentation: a docs folder, a `--help`, a man page, built-in help, the package source under
   the interpreter's library path. Read it with your shell. It is the maintainers' own text, so it
   is tier 1 too.
3. **Another page by the same author.** A maintainer's talk, release notes or mailing list post can
   carry the same claim.

Cite the URL you actually read, not the one you wish had loaded. Quoting the rendered page while
reading the repo source is the same mistake as quoting a snippet.

Only when none of that reaches a concept do you drop it. Note the host that refused, say so once at
the end of research, and never route around the block.

## 3. Pull claims as you read

For each page you keep, record the claims you would teach from it. A claim is three things:

- `quote`: copied from the page, character for character, long enough to stand alone and short
  enough to be about one thing. Never paraphrase, never fix its spelling, never stitch two sentences
  together.
- `url`: the page, or its anchor when the page is long.
- `conceptId`: kebab-case, the concept this claim backs. These become the concept map's ids, so pick
  names you will still want later (`list-comprehension`, not `thing-one`).

Give each source a short kebab-case `id` of its own. You will cite it in lesson text as
`[^that-id]`, so keep it short and memorable.

## 4. Tier every source

| Tier | What it is | What it is good for |
|---|---|---|
| 1 | Official docs, specs, RFCs, source code, maintainer posts and talks | Ground truth for facts |
| 2 | Respected engineering blogs, books, university courses, known educators | Explanations, examples, routes through the topic |
| 3 | Stack Overflow, dev.to, Medium, forums | Common mistakes only |
| 4 | SEO farms, generated listicles, copied content | Drop it, do not submit it |

Within a tier, lean on the source with more authority, a version that matches, agreement from
others, and real depth: examples, code, diagrams. Teach facts from tier 1, routes and examples from
tier 2, and mistakes from tier 3.

## 5. Cross-check before you believe it

Keep a claim when a tier 1 source states it, or when two independent sources agree. Two pages that
copy the same wording are one source.

When sources conflict, do not average them and do not guess. Record both quotes. Teach the tier 1
version and say plainly that other sources disagree, or leave the point out.

## 6. Stop

Stop when three pages in a row add no new concept. Most topics land between 6 and 12 kept pages. A
second pass on a thin concept beats a tenth page on one already covered.

## Repositories

When the topic is a library or a codebase: shallow clone it, read the README, the docs folder, the
entry points and the tests. Tests are the most honest examples in any repo. Quote files by their
permalink at the commit you read, and treat the code as tier 1.

## Closed software

A reverse-engineering tool run on your own machine can inspect native binaries, desktop apps,
websites and mobile packages, and returns evidence. Treat that evidence as tier 1 for how that
product behaves, quote it like any other source, and reach for it only when public sources fall
short. The course must still make sense to someone who has only the public sources.

## Keep the pack in a file

Write the sources to one JSON file as you go, shaped exactly like `submit_research`'s `sources`:

```json
[
  {
    "id": "py-tutorial-datastructures",
    "url": "https://example.invalid/tutorial/datastructures.html",
    "title": "Data Structures, the official tutorial",
    "tier": 1,
    "claims": [
      {
        "quote": "List comprehensions provide a concise way to create lists.",
        "url": "https://example.invalid/tutorial/datastructures.html#list-comprehensions",
        "conceptId": "list-comprehension"
      }
    ]
  }
]
```

A long research step can outgrow what you hold in your head, and the file survives a compaction.
Then send the whole array with `submit_research`.

## What submit_research checks

Source ids must be unique and kebab-case, urls must parse, tiers must be 1 to 4, and every claim
needs a quote, a url and a conceptId. The reply tells you the tier spread and the concept ids your
claims named. Read that list: it is the raw material of the concept map, and a concept named by one
tier 3 claim is a concept you cannot yet teach.
