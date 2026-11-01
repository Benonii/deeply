# Deeply

**Live:** https://deeply-six.vercel.app

Open-source deep-dive courses on how things really work. Each course has animated, step-through diagrams of every moving part, the real source code behind them (for codebases), quick checks, challenges, and a **Simplify** button on every block for when an explanation gets too dense.

- **Built-in courses:** *Convex, Deeply* (a reactive database and sync engine, mapped to Convex's real Rust and TypeScript source) and *CRDTs, Deeply* (local-first sync).
- **Create your own:** sign in, name a concept or paste a public GitHub repo, and Deeply researches it, takes its visual identity from the project's own brand, and writes a full course with an LLM (OpenAI or Claude, via the Vercel AI SDK). Code excerpts are copied verbatim from the repo, never written by the model.
- **Simplify:** rewrites any block at three levels (Plainer, Like I'm new, Like I'm 12). Rewrites are cached and shared, so each one is only paid for once.

Stack: [Farm.js](https://farmjs.dev) + React 18, Convex (through `@farm.js/convex`) (database, functions, scheduling), Better Auth, Polar (credits), Vercel AI SDK with OpenAI or Claude (generation and Simplify), shaders from paper.design.

[![CI](https://github.com/Benonii/deeply/actions/workflows/ci.yml/badge.svg)](https://github.com/Benonii/deeply/actions/workflows/ci.yml) · MIT licensed · course content about third-party projects is unofficial and not affiliated with them.

## Local development
```bash
npm install
npx convex dev --once   # first time only: creates a dev deployment and writes CONVEX_URL to .env.local
npx convex env set SITE_URL http://localhost:3000
npm run dev             # http://localhost:3000, also runs `convex dev`
```
The built-in courses work without a backend. Sign-in, Simplify, community courses and the Convex Live Lab need one. To try the generator without an API key, set `GENERATOR_FAKE=1` on a **dev** deployment and it writes a small fixture course.

Full production setup (OAuth apps, Polar, environment variables, Vercel): [docs/SETUP.md](docs/SETUP.md).

## Desktop app
Deeply also builds as a native desktop app from the same source, using Farm.js's desktop target (an Electrobun window around the Farm server, running on `127.0.0.1`). It talks to the production Convex backend unless `CONVEX_URL` is set.

```bash
npm run dev:desktop     # the app in a window, with hot reload
npm run build:desktop   # packaged app in .farm/output/desktop/dist
```
On Linux the window uses the system WebKitGTK, so install `libwebkit2gtk-4.1-0` and `libgtk-3-0` (Debian/Ubuntu names) first. The first run downloads the Electrobun runtime into `~/.hutch`.

Sign-in on desktop goes through your browser: **Sign in with your browser** opens `/desktop/connect` on the website, you approve there, and the app picks up the session. The session cookie stays in the app's data folder on the local server and never reaches the window.

## How it's organized
| Path | What |
|---|---|
| `src/engine/` | Course engine: kit components (Section, Callout, Code, Flow, Check…), pack renderer, code drawer, Simplify UI, theming |
| `src/app/` | Farm.js file routes (each one renders a page from `src/pages/`) |
| `src/pages/` | Page components and the root layout |
| `src/platform/` | App shell, navigation, catalog |
| `src/courses/` | Built-in courses: `convex/` (React modules, simulators, Live Lab, verified source map) and `crdts/` (a JSON course pack) |
| `src/desktop/` | Desktop-only server code: forwards auth to Convex with the session kept on disk |
| `src/create/`, `src/account/` | Course generator UI; sign-in, credits, buying credits |
| `convex/lib/courseSchema.ts` | The course pack format (zod), shared by hand-written and generated courses |
| `convex/generate/` | Generation pipeline: research → plan → modules in parallel → challenges, each step validated |
| `convex/simplify.ts`, `wallet.ts`, `billing.ts`, `rateLimits.ts`, `auth.ts` | Simplify, credits ledger, Polar webhooks, rate limits, auth |

## Writing a course by hand
Add a folder under `src/courses/` that exports a `BuiltinCourse` (see `src/courses/crdts/` for a complete JSON pack) and register it in `src/courses/index.ts`. Packs are validated by `CoursePack` and `lintModule` in `convex/lib/courseSchema.ts`.

## Scripts
- `npm run typecheck`: app and Convex functions
- `npm run fetch-sources` / `npm run verify-code`: re-check every Convex source excerpt is verbatim against the pinned commits

## Contributing & license
See [CONTRIBUTING.md](CONTRIBUTING.md). Code and original content: [MIT](LICENSE). Third-party source excerpts keep their own licenses: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
