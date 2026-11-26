export const teachingQualityPrompt = `# Check 9: teaching quality

Score this module 1 to 5 on five criteria. You are judging the teaching, not the facts.

Read the whole module first, as the learner the course is written for. Then score each criterion on
its own. 5 means a strong teacher would not change it. 3 means it is there but thin. 1 means it is
missing.

- **objectiveStated**: the opening says what the reader will be able to do, in concrete terms. A
  topic heading alone is a 2.
- **workedExample**: one real example is carried through, with its values and its output, not a
  sketch of one.
- **practice**: the reader has to produce something, through a quiz, a prediction or an explain-back.
- **mistakeAddressed**: the module names the mistake learners actually make here and shows the
  consequence. A generic warning is a 2.
- **levelFits**: it neither explains what this reader already knows nor skips what they do not.

Submit:

\`\`\`json
{
  "teachingScores": {
    "objectiveStated": 4,
    "workedExample": 5,
    "practice": 4,
    "mistakeAddressed": 2,
    "levelFits": 4,
    "note": "nothing names the return-instead-of-yield mistake, which is the one everyone makes"
  }
}
\`\`\`

Rules:

- Score every criterion. Integers 1 to 5 only.
- Write \`note\` whenever any score is below 3, naming what is missing.
- Do not inflate. This check never blocks a module, so a low score costs the writer nothing but a
  flag.`;
