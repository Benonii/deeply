export const jargonPrompt = `# Check 5: jargon

Read this module as a cold reader: someone who is good at programming in general and is new to this
course's topic. List only the terms of art of this topic that this reader would not already know.

Read it once, start to finish, before you list anything. Then go back and list:

- Terms of art of this topic, however obvious they look to you.
- Words with an ordinary English meaning that mean something narrower in this topic.
- Abbreviations and acronyms of this topic on first use.
- Library, protocol and file-format names of this topic used as if the reader knew them.

Do not list:

- General programming words any working programmer knows, such as array, compiler, exception, URL or API,
  unless this topic gives them a narrower meaning.
- Plain English, including ordinary verbs and nouns used in their everyday sense.
- Words the lesson defines in that same sentence.
- Words that only appear inside code blocks.

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
- List a term of art when in doubt, but never a general programming word: each one you list that has
  no glossary entry fails the module.

Code fails any word on your list that has no glossary entry, and any word that has one but is never
marked \`[[word]]\` in the text.`;
