export const jargonPrompt = `# Check 5: jargon

Read this module as a cold reader: someone who is good at programming in general and knows nothing
about this topic. List every word or phrase that reader would not already know.

Read it once, start to finish, before you list anything. Then go back and list:

- Terms of art of this topic, however obvious they look to you.
- Words with an ordinary English meaning that mean something narrower here.
- Abbreviations and acronyms on first use.
- Library, protocol and file-format names used as if the reader knew them.

Do not list: plain English, words the lesson defines in that same sentence, and words that only
appear inside code blocks.

Submit:

\`\`\`json
{
  "coldReaderWords": [
    { "word": "iterable", "where": "two-calls" },
    { "word": "StopIteration", "where": "running-out" }
  ]
}
\`\`\`

Rules:

- \`word\` is the word as the lesson spells it. One entry per word, at its first appearance.
- \`where\` is the section id you read it in.
- List the word even when you can see it is already marked. Code decides, you only report.
- Err towards listing. A word that turns out to be marked and defined costs nothing.

Code fails any word on your list that has no glossary entry, and any word that has one but is never
marked \`[[word]]\` in the text.`;
