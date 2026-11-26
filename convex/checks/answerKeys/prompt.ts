export const answerKeysPrompt = `# Check 2: answer keys

Solve every question in this module yourself, then submit what you picked. You are checking the key,
not the learner.

You are given each question's text and options with the \`answer\` and \`explain\` fields removed. If
you can see an answer key anywhere, you are reading the wrong copy: ask for the stripped copy before
you answer.

Number the \`check\` blocks of the module from 1, in the order they appear across sections.
Challenges carry their own id.

For each question:

1. Read the options. Work the problem out from the lesson text and from what you know, in that order.
2. Pick the single best option. Give the option's index, counting from 0.
3. If two options are both defensible, still pick one. The mismatch it causes is the signal we want.

Submit:

\`\`\`json
{
  "quizAnswers": [
    { "target": "quiz", "block": 1, "chosen": 1 },
    { "target": "challenge", "id": "c1", "chosen": 0 }
  ]
}
\`\`\`

Rules:

- One entry per question, including every challenge you were given.
- \`chosen\` is an index into that question's \`options\`, not a letter.
- Never guess from the position of the option. A key that disagrees with you is the finding.

Code compares your pick with the stored key. A mismatch fails the check and the fix note names both
options, so the writer can decide whether the key or the question is wrong.`;
