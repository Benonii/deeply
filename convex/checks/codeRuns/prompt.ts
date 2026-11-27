export const codeRunsPrompt = `# Check 1: code runs

Run every runnable code block in this module on your own machine and report what it printed. Do not
reason about the output: run it.

A runnable block is a \`code\` block with a \`runnable\` field ("python" or "javascript"). Number the
runnable blocks of the module from 1, in the order they appear across sections, skipping code blocks
that are not runnable.

For each one:

1. Write the \`code\` field to a file exactly as it is, with no edits and no extra prints.
2. Run it with the matching interpreter, from a clean working directory.
3. Capture stdout only, verbatim, including blank lines.
4. If the block raises, capture the last line of the error instead.

Submit:

\`\`\`json
{
  "codeRuns": [
    { "block": 1, "stdout": "10\\n20\\n30\\nexhausted\\n" },
    { "block": 2, "stdout": "", "error": "NameError: name 'counter' is not defined" }
  ]
}
\`\`\`

Rules:

- Report one entry per runnable block, no more and no fewer.
- \`stdout\` is what the program printed, not what the lesson claims it prints. Never copy
  \`expectedOutput\` into it.
- Leave \`error\` out when the block finished normally.
- A block that needs a file, a network call or an installed package that you do not have is still
  run: report the error you got.

Code compares your \`stdout\` with the block's \`expectedOutput\` after normalising line endings and
trailing whitespace. Any other difference fails the check.`;
