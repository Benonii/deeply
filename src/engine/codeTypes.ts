export const SHAS = {
  'convex-backend': '95d8719cb6931cd2322453bb900dfcd5a732fe81',
  'convex-js': '322c39518794e588845caee90ee77fad6ebda8ba',
} as const;

export type Repo = keyof typeof SHAS;

/** Built-in Convex refs use a short repo key; generated courses use "owner/name" plus their own sha. */

/** A real excerpt from Convex's source, attached to a diagram node or edge. */
export type CodeRef = {
  id: string; // stable key, e.g. 'sync.worker'
  title: string; // human title, e.g. 'SyncWorker: one per WebSocket'
  repo: Repo | string;
  sha?: string;
  path: string; // repo-relative path
  startLine: number; // line of the first excerpt line in the real file
  endLine: number;
  symbol: string; // main fn/struct/class shown
  lang: string;
  summary: string; // one sentence: what this code is responsible for
  explain: string; // 1-3 paragraphs: how it works, what to notice
  notes?: { line: number; text: string }[]; // annotations keyed by real file line number
  code: string; // verbatim excerpt; elisions marked with a line containing only `// …`
};

export function refUrl(codeRef: CodeRef) {
  const lines = `#L${codeRef.startLine}-L${codeRef.endLine}`;
  if (codeRef.repo in SHAS) return `https://github.com/get-convex/${codeRef.repo}/blob/${codeRef.sha ?? SHAS[codeRef.repo as Repo]}/${codeRef.path}${lines}`;
  return `https://github.com/${codeRef.repo}/blob/${codeRef.sha ?? 'HEAD'}/${codeRef.path}${lines}`;
}
