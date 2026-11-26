export const quizQualityPrompt = `# Check 7: quiz quality

For each quiz in this module, say whether its wrong options are mistakes a learner really makes.

Code already checks the mechanical side: one concept tagged, the answer in range, three to five
options, no option repeated. Your job is the one part code cannot see.

Number the \`check\` blocks of the module from 1, in the order they appear across sections. For each:

1. Read the question and the correct option.
2. Take each wrong option in turn and ask: would a learner who half-understands this topic pick it?
   A good wrong option comes from a real misreading: the opposite direction, the eager version of a
   lazy thing, the value before the operation instead of after, the behaviour of the neighbouring
   API.
3. Answer false if any wrong option is filler: absurd, obviously wrong on sight, a joke, a
   category error, or a near-duplicate of another option with no real difference.
4. Name the weak option in \`note\` when you answer false.

Submit:

\`\`\`json
{
  "quizDistractors": [
    { "block": 1, "hasMistakeBasedOptions": true },
    {
      "block": 2,
      "hasMistakeBasedOptions": false,
      "note": "option C says yield writes to stderr, which no learner believes"
    }
  ]
}
\`\`\`

Rules:

- One entry per quiz, no more and no fewer.
- Judge the wrong options only. Whether the key is right is check 2's job.
- One filler option is enough to answer false.`;
