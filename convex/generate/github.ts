/**
 * GitHub research for repo courses, plus the verbatim code-ref resolver.
 * Pure fetch: runs in either Convex runtime.
 */

export const REPO_BYTES_CAP = 400_000;
const FILE_BYTES_CAP = 60_000;
const HOMEPAGE_BYTES_CAP = 200_000;

export type RepoFile = { path: string; text: string };
export type RepoContext = {
  owner: string;
  name: string;
  sha: string;
  description: string;
  homepage: string | null;
  stars: number;
  languages: string[];
  readme: string;
  tree: string[]; // all blob paths (truncated list)
  files: RepoFile[]; // fetched source files, verbatim
  brandDigest: string; // hints scraped from the homepage for brand extraction
};

export class RepoError extends Error {}

export function parseRepoUrl(url: string): { owner: string; name: string } | null {
  const m = url.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?(?:[#?].*)?$/);
  if (!m) return null;
  return { owner: m[1], name: m[2] };
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'deeply-course-generator' };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers() });
  if (res.status === 404) throw new RepoError('Repository not found or private. Only public GitHub repositories are supported.');
  if (res.status === 403 || res.status === 429) throw new RepoError('GitHub rate limit reached. Try again in a few minutes.');
  if (!res.ok) throw new RepoError(`GitHub API error ${res.status} for ${path}`);
  return (await res.json()) as T;
}

async function rawFile(owner: string, name: string, sha: string, path: string, cap = FILE_BYTES_CAP): Promise<string | null> {
  const res = await fetch(`https://raw.githubusercontent.com/${owner}/${name}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { 'User-Agent': 'deeply-course-generator' },
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (text.length > cap || text.includes('\u0000')) return null;
  return text;
}

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|rs|go|py|rb|java|kt|swift|c|cc|cpp|h|hpp|cs|ex|exs|scala|zig|lua|php|sql)$/i;
const SKIP = /(^|\/)(node_modules|vendor|dist|build|target|\.git|__tests__|tests?|spec|examples?|docs?|fixtures?|benchmarks?|third_party)(\/|$)|\.(min|d)\.\w+$|_test\.|\.test\.|\.spec\./i;

/** Rank paths so the most "central" source files come first. */
function rankPaths(paths: string[], repoName: string): string[] {
  const score = (p: string) => {
    let s = 0;
    const depth = p.split('/').length;
    s -= Math.abs(depth - 3) * 2;
    if (/(^|\/)(src|lib|crates|packages|pkg|internal|core)\//.test(p)) s += 6;
    if (/(index|main|lib|mod|core|engine|server|client|runtime|store|db|sync|scheduler|router)\.\w+$/i.test(p)) s += 5;
    if (p.toLowerCase().includes(repoName.toLowerCase())) s += 1;
    return s;
  };
  return [...paths].sort((a, b) => score(b) - score(a));
}

export async function fetchRepoContext(owner: string, name: string, log?: (m: string) => Promise<unknown>): Promise<RepoContext> {
  const repo = await gh<{
    private: boolean;
    size: number;
    default_branch: string;
    description: string | null;
    homepage: string | null;
    stargazers_count: number;
    archived: boolean;
  }>(`/repos/${owner}/${name}`);
  if (repo.private) throw new RepoError('Private repositories are not supported.');
  if (repo.size > 2_000_000) throw new RepoError('This repository is too large to analyse (over ~2 GB).');

  const branch = await gh<{ commit: { sha: string } }>(`/repos/${owner}/${name}/branches/${encodeURIComponent(repo.default_branch)}`);
  const sha = branch.commit.sha;
  await log?.(`Pinned ${owner}/${name}@${sha.slice(0, 10)} (${repo.default_branch})`);

  const tree = await gh<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(
    `/repos/${owner}/${name}/git/trees/${sha}?recursive=1`,
  );
  const blobs = tree.tree.filter((t) => t.type === 'blob');
  const languages = Object.keys(await gh<Record<string, number>>(`/repos/${owner}/${name}/languages`).catch(() => ({}))).slice(0, 6);

  let readme = '';
  const readmePath = blobs.find((b) => /^readme(\.md|\.rst|\.txt)?$/i.test(b.path))?.path;
  if (readmePath) readme = ((await rawFile(owner, name, sha, readmePath, 40_000)) ?? '').slice(0, 30_000);

  // Pick source files until the byte budget is spent.
  const candidates = rankPaths(
    blobs.filter((b) => SOURCE_EXT.test(b.path) && !SKIP.test(b.path) && (b.size ?? 0) > 400 && (b.size ?? 0) < FILE_BYTES_CAP).map((b) => b.path),
    name,
  );
  const files: RepoFile[] = [];
  let bytes = readme.length;
  for (const path of candidates) {
    if (files.length >= 40 || bytes > REPO_BYTES_CAP) break;
    const text = await rawFile(owner, name, sha, path);
    if (!text) continue;
    if (bytes + text.length > REPO_BYTES_CAP) continue;
    files.push({ path, text });
    bytes += text.length;
  }
  await log?.(`Read README and ${files.length} source files (${Math.round(bytes / 1000)} KB)`);

  const brandDigest = repo.homepage ? await fetchBrandDigest(repo.homepage).catch(() => '') : '';
  return {
    owner,
    name,
    sha,
    description: repo.description ?? '',
    homepage: repo.homepage || null,
    stars: repo.stargazers_count,
    languages,
    readme,
    tree: blobs.map((b) => b.path).slice(0, 1500),
    files,
    brandDigest,
  };
}

/** Pull colour, font and logo hints out of a homepage so the model can match the real brand. */
export async function fetchBrandDigest(url: string): Promise<string> {
  const u = /^https?:\/\//.test(url) ? url : `https://${url}`;
  const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (deeply-course-generator)' }, redirect: 'follow' });
  if (!res.ok) return '';
  const html = (await res.text()).slice(0, HOMEPAGE_BYTES_CAP);
  const count = (re: RegExp) => {
    const m = new Map<string, number>();
    for (const x of html.matchAll(re)) m.set(x[1].toLowerCase(), (m.get(x[1].toLowerCase()) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const hexes = count(/(#[0-9a-fA-F]{6})\b/g).slice(0, 16).map(([c, n]) => `${c}×${n}`);
  const vars = [...html.matchAll(/(--[\w-]*(?:color|brand|primary|accent|bg|background)[\w-]*)\s*:\s*([^;}{]{3,40})/gi)].slice(0, 20).map((m) => `${m[1]}: ${m[2].trim()}`);
  const fonts = count(/font-family\s*:\s*([^;}"]{3,80})/gi).slice(0, 6).map(([f]) => f);
  const gfonts = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/g)].map((m) => decodeURIComponent(m[1]).replace(/\+/g, ' ')).slice(0, 4);
  const theme = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i)?.[1];
  const title = html.match(/<title>([^<]{0,120})/i)?.[1];
  const logo = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+\.svg)/i)?.[1];
  return [
    `homepage: ${u}`,
    title && `title: ${title}`,
    theme && `theme-color: ${theme}`,
    hexes.length && `most used hex colours: ${hexes.join(', ')}`,
    vars.length && `css colour variables:\n  ${vars.join('\n  ')}`,
    fonts.length && `font-family declarations: ${fonts.join(' | ')}`,
    gfonts.length && `google fonts loaded: ${gfonts.join(', ')}`,
    logo && `svg icon: ${logo}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* Verbatim code refs                                                  */
/* ------------------------------------------------------------------ */

/** What the model proposes: a location, never the code itself. */
export type RefRequest = {
  id: string;
  title: string;
  path: string;
  startLine: number;
  endLine: number;
  firstLine?: string; // the exact text of startLine, used to re-anchor off-by-n errors
  symbol: string;
  summary: string;
  explain: string;
  notes?: { line: number; text: string }[];
};

const LANG: Record<string, string> = { rs: 'rust', ts: 'ts', tsx: 'ts', js: 'ts', jsx: 'ts', mjs: 'ts', go: 'go', py: 'python' };

/**
 * Turns a model's proposed excerpt location into a CodeRef whose code is
 * copied from the real file. Returns null when the location can't be resolved.
 */
export function resolveRef(req: RefRequest, files: RepoFile[], repo: { owner: string; name: string; sha: string }) {
  const file = files.find((f) => f.path === req.path);
  if (!file) return null;
  const lines = file.text.split('\n');
  let start = Math.floor(req.startLine);
  let end = Math.floor(req.endLine);
  if (!(start >= 1 && end >= start)) return null;
  // Re-anchor: models are often a few lines off. Find firstLine nearest to the claimed start.
  if (req.firstLine && req.firstLine.trim()) {
    const want = req.firstLine.trim();
    if ((lines[start - 1] ?? '').trim() !== want) {
      let best = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === want && (best < 0 || Math.abs(i + 1 - start) < Math.abs(best + 1 - start))) best = i;
      }
      if (best < 0) return null;
      const shift = best + 1 - start;
      start += shift;
      end += shift;
    }
  }
  end = Math.min(end, lines.length, start + 79); // cap excerpts at 80 lines
  if (start > lines.length) return null;
  const code = lines.slice(start - 1, end).join('\n');
  if (!code.trim()) return null;
  const ext = req.path.split('.').pop()?.toLowerCase() ?? '';
  return {
    id: req.id,
    title: req.title,
    repo: `${repo.owner}/${repo.name}`,
    sha: repo.sha,
    path: req.path,
    startLine: start,
    endLine: end,
    symbol: req.symbol,
    lang: LANG[ext] ?? ext,
    summary: req.summary,
    explain: req.explain,
    notes: (req.notes ?? []).filter((n) => n.line >= start && n.line <= end),
    code,
  };
}

/** Compact listing of files for prompts: path + numbered lines. */
export function numbered(file: RepoFile, maxLines = 900): string {
  const lines = file.text.split('\n').slice(0, maxLines);
  const w = String(lines.length).length;
  return lines.map((l, i) => `${String(i + 1).padStart(w)}| ${l}`).join('\n');
}
