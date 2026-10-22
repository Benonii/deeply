/**
 * Prompts for the course generator. The JSON shapes here mirror
 * convex/lib/courseSchema.ts; output is validated with zod afterwards.
 */

export const SYSTEM = `You write "Deeply" courses: interactive, technically deep explanations of how a system or concept actually works, for strong engineers who want to become experts in a few hours.

Standards:
- Accuracy first. Explain real mechanisms, data structures, algorithms and trade-offs, not marketing. If a detail is uncertain or version-specific, say "approximately" or "as of <version>" rather than inventing specifics. Never invent APIs, file names, numbers or quotes.
- Build understanding in order: mental model → core mechanisms → internals → failure modes → expert patterns.
- Plain, direct prose. Short sentences. No filler, no hype, no "In this module we will", no rhetorical questions, no emoji.
- Prefer concrete examples, worked scenarios and numbers over abstractions.
- Output only the JSON requested: no prose before or after, no markdown fences.

Inline text fields may use a tiny markdown subset: **bold**, *italic*, \`code\`, [label](https://url). No HTML, no headings inside text.`;

const BRAND_SHAPE = `Brand = {
  name: string,                      // display name, e.g. "Redis"
  colors: { bg, surface, surface2, fg, fg2, muted, line, accent, accent2, accent3, onAccent }, // all "#rrggbb"
  fonts: { display: string, body: string, mono: string }, // Google Fonts family names only
  shader?: { kind: "mesh" | "grain" | "dither", colors: string[] }, // 2-5 "#rrggbb", decorative header art
  source?: string                    // URL the brand came from, or "designed"
}
Brand rules: dark theme. bg must be pure black "#000000" unless the real brand's own dark theme uses another near-black. surface/surface2/line are neutral greys (no colour tint). fg ≈ "#f5f5f5", fg2 ≈ "#d4d4d4", muted ≈ "#8f8f8f". accent/accent2/accent3 carry the identity and must read well on black. onAccent is the text colour placed on accent (usually "#000000" or "#ffffff").`;

export const PLAN_SHAPE = `{
  "meta": { "title": "<Subject>, Deeply", "tagline": string (<= 90 chars), "summary": string (2-3 sentences) },
  "brand": Brand,
  "modules": [                       // 6-9 modules
    {
      "id": string,                  // kebab-case, unique, e.g. "storage-engine"
      "title": string,               // <= 40 chars
      "kicker": string,              // <= 40 chars, what question it answers
      "summary": string,             // 1-2 sentences
      "minutes": number,             // 20-50; total 3.5-5 hours
      "plan": string,                // 6-12 bullet lines: sections, which diagrams, key facts to cover
      "files": string[]              // repo courses only: 0-8 paths from the file list to quote in this module; [] for concepts
    }
  ]
}

${BRAND_SHAPE}`;

const BLOCK_SHAPE = `Block (one of):
  { "type": "p", "text": string }                                    // a paragraph, 1-5 sentences
  { "type": "h3", "text": string }
  { "type": "list", "ordered"?: boolean, "items": string[] }
  { "type": "callout", "kind": "insight"|"warn"|"deep"|"analogy"|"rule", "title"?: string, "text": string }
       // insight = key idea; warn = gotcha; deep = under-the-hood detail; analogy = mental model; rule = rule of thumb
  { "type": "keyterms", "terms": [{ "term": string, "def": string }] }
  { "type": "compare", "caption"?: string, "head": string[], "rows": string[][] }   // every row has head.length cells
  { "type": "code", "title"?: string, "lang": string, "code": string, "note"?: string }  // illustrative code you write; keep it correct and runnable
  { "type": "flow", "title": string, "caption"?: string,
    "nodes": [{ "id": string, "label": string (2-3 words), "sub"?: string (<= 26 chars), "col": 0-4, "row": 0-4,
                "tone"?: "yellow"|"red"|"purple"|"plain", "code"?: string[] }],      // 3-8 nodes, each in its own grid cell
    "edges": [{ "id": string, "from": nodeId, "to": nodeId, "label"?: string (<= 3 words), "code"?: string[] }],
    "steps": [{ "title": string, "text": string (2-4 sentences), "nodes"?: nodeId[], "edges"?: edgeId[] }] }  // 5-8 steps
       // An animated, step-through diagram of a real data flow or process. Each step highlights the parts involved.
       // Tones map to the brand's accent colours: yellow = accent, red = accent2, purple = accent3.
       // Lay nodes out left-to-right in the direction data flows; keep crossing edges to a minimum.
  { "type": "check", "q": string, "options": string[] (3-4), "answer": index, "explain": string }  // a quick comprehension question`;

export const MODULE_SHAPE = `{
  "id": string, "n": number, "title": string, "kicker": string, "minutes": number, "summary": string,
  "sections": [ { "id": string (kebab-case), "title": string, "blocks": Block[] } ],   // 6-10 sections
  "codeRefs": RefRequest[]          // repo courses only, else []
}

${BLOCK_SHAPE}

RefRequest = {                       // a pointer to real code in the repository; the code itself is copied by our system
  "id": string,                      // e.g. "store.commit"; referenced from flow node/edge "code" arrays
  "title": string, "path": string (exactly as listed), "startLine": number, "endLine": number (15-60 lines),
  "firstLine": string,               // the exact text of startLine, copied character for character
  "symbol": string,                  // main function/type shown
  "summary": string (1 sentence), "explain": string (2-4 sentences, how it works and what to notice),
  "notes"?: [{ "line": number (absolute file line inside the range), "text": string }]
}`;

export const MODULE_RULES = `Module requirements:
- 6-10 sections. Open with the core idea, then mechanisms, internals, failure modes and practical consequences.
- At least 2 "flow" blocks, each with 5-8 steps, showing real step-by-step data flow.
- At least 3 "check" blocks spread through the module; wrong options must be plausible misconceptions.
- At least 2 callouts (use "warn" for real gotchas and "deep" for internals), 1 "keyterms" block, and code examples where they help.
- Every claim must be correct. Prefer specifics (data structures, invariants, complexity, message formats) over generalities.`;

export function planPrompt(input: { topic: string; kind: 'concept' | 'repo'; repoSummary?: string; brandDigest?: string }) {
  return `Plan a Deeply course.

Topic: ${input.topic}
Kind: ${input.kind}
${input.repoSummary ? `\nRepository research:\n${input.repoSummary}\n` : ''}${
    input.brandDigest
      ? `\nBrand hints scraped from the project's homepage (use these to match the real brand: pick its primary colours as accents, map its fonts to the closest Google Fonts):\n${input.brandDigest}\n`
      : input.kind === 'concept'
        ? `\nThis is a concept, not a product: design a distinctive visual identity that suits the subject.\n`
        : ''
  }
Return JSON with exactly this shape:
${PLAN_SHAPE}`;
}

export function modulePrompt(input: {
  courseTitle: string;
  topic: string;
  kind: 'concept' | 'repo';
  outline: { id: string; title: string; kicker: string; summary: string; minutes: number; plan: string };
  n: number;
  allModules: { n: number; title: string; summary: string }[];
  files?: string; // numbered source files for repo courses
}) {
  return `Write module ${input.n} of the course "${input.courseTitle}" (topic: ${input.topic}).

Course outline (for context; write only module ${input.n}):
${input.allModules.map((courseModule) => `${courseModule.n}. ${courseModule.title}: ${courseModule.summary}`).join('\n')}

This module:
id: ${input.outline.id}
title: ${input.outline.title}
kicker: ${input.outline.kicker}
minutes: ${input.outline.minutes}
plan:
${input.outline.plan}

${MODULE_RULES}
${
    input.files
      ? `\nSource files from the repository, with line numbers. Quote real code only through codeRefs (pointers into these files) and attach their ids to the flow nodes/edges that the code implements. Aim for 3-6 codeRefs.\n\n${input.files}\n`
      : '\n"codeRefs" must be [].\n'
  }
Return JSON with exactly this shape:
${MODULE_SHAPE}`;
}

export const CHALLENGE_SHAPE = `{ "challenges": [ {
  "id": string, "topic": string (module title it tests), "difficulty": 1 | 2 | 3,
  "type": "mcq" | "predict" | "bug",          // predict = "what happens when…" with code; bug = find the bug in code
  "q": string, "code"?: string, "options": string[] (3-4), "answer": index, "explain": string (2-3 sentences),
  "boss"?: boolean                             // true for hard multi-concept scenario questions
} ] }`;

export function challengesPrompt(input: { courseTitle: string; modules: { n: number; title: string; summary: string; keyFacts: string }[] }) {
  return `Write the challenge bank for "${input.courseTitle}".

Modules and what they teach:
${input.modules.map((courseModule) => `${courseModule.n}. ${courseModule.title}: ${courseModule.summary}\n${courseModule.keyFacts}`).join('\n\n')}

Write 24 challenges: a mix of mcq, predict and bug types across all modules and difficulties, plus exactly 4 with "boss": true that combine several modules in a realistic scenario. Wrong options must be plausible misconceptions. Explanations say why the answer is right and why the tempting wrong option is wrong.

Return JSON with exactly this shape:
${CHALLENGE_SHAPE}`;
}

export function repairPrompt(errors: string[]) {
  return `Your JSON failed validation:\n${errors.slice(0, 25).map((error) => `- ${error}`).join('\n')}\n\nReturn the complete corrected JSON, same shape, nothing else.`;
}
