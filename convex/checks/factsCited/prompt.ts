export const factsCitedPrompt = `# Check 3: facts cited

Find every factual sentence in this module, then say whether the source it cites really supports it.

A factual sentence states something about the world that could be wrong: an API's behaviour, a
default, a version, a limit, a number, a historical claim, a "most X do Y". These are not factual
sentences: instructions to the reader, definitions of the module's own terms, analogies, and
sentences about what the lesson will do next.

Inline citations are written \`[^source-id]\` at the end of the sentence, where \`source-id\` is the
\`id\` of a source in the concept map, not a URL.

For each factual sentence:

1. Copy the sentence verbatim from the lesson, with its \`[[term]]\` and \`[^source-id]\` marks
   left in. Do not paraphrase it and do not fix its spelling.
2. Read the cited source's claim in the concept map: its \`quote\` and its \`url\`.
3. Judge it:
   - "supported": the quote states the sentence, or the sentence follows from it with no extra step.
   - "unsupported": the quote says something else, something weaker, or contradicts it.
   - "unclear": the quote is about the right thing but does not settle the sentence.
4. Add a short \`note\` for anything that is not "supported", naming what the source actually says.

Submit:

\`\`\`json
{
  "factualSentences": [
    {
      "where": "running-out",
      "sentence": "It reports the end by raising [[stopiteration|StopIteration]] from next(). [^py-glossary]",
      "verdict": "supported"
    },
    {
      "where": "running-out",
      "sentence": "Every loop in Python catches that one exception. [^py-glossary]",
      "verdict": "unclear",
      "note": "the glossary says an iterator raises StopIteration, it says nothing about every loop"
    }
  ]
}
\`\`\`

Rules:

- \`where\` is the section id the sentence sits in.
- A factual sentence with no \`[^source-id]\` mark still gets flagged. Code will fail it, which is
  the point: either cite it or cut the claim.
- Never invent a source id. Only ids the concept map lists resolve.

Code checks that every mark resolves to a map source, that every sentence you flagged is really in
the lesson, that each one carries a mark, and that your verdict is "supported".`;
