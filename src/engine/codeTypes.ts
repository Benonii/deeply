export const SHAS = {
  'convex-backend': '95d8719cb6931cd2322453bb900dfcd5a732fe81',
  'convex-js': '322c39518794e588845caee90ee77fad6ebda8ba',
} as const;

export type Repo = keyof typeof SHAS;


export type CodeRef = {
  id: string;
  title: string;
  repo: Repo | string;
  sha?: string;
  path: string;
  startLine: number;
  endLine: number;
  symbol: string;
  lang: string;
  summary: string;
  explain: string;
  notes?: { line: number; text: string }[];
  code: string;
};

export function refUrl(codeRef: CodeRef) {
  const lines = `#L${codeRef.startLine}-L${codeRef.endLine}`;
  if (codeRef.repo in SHAS) return `https://github.com/get-convex/${codeRef.repo}/blob/${codeRef.sha ?? SHAS[codeRef.repo as Repo]}/${codeRef.path}${lines}`;
  return `https://github.com/${codeRef.repo}/blob/${codeRef.sha ?? 'HEAD'}/${codeRef.path}${lines}`;
}
