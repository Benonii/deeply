import { isNeutralColor } from '../lib/brandContrast';

export const REPO_BYTES_CAP = 400_000;
const FILE_BYTES_CAP = 60_000;
const HOMEPAGE_BYTES_CAP = 200_000;
const STYLESHEET_LIMIT = 2;
const MONOCHROME_SHARE = 0.8;
export const MONOCHROME_HINT = 'palette: monochrome';

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
  tree: string[];
  files: RepoFile[];
  brandDigest: string;
};

export class RepoError extends Error {}

export function parseRepoUrl(url: string): { owner: string; name: string } | null {
  const match = url
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?(?:[#?].*)?$/);
  if (!match) return null;
  return { owner: match[1], name: match[2] };
}

function headers(): Record<string, string> {
  const requestHeaders: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'deeply-course-generator'
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  return requestHeaders;
}

async function fetchGitHub<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, { headers: headers() });
  if (response.status === 404)
    throw new RepoError('Repository not found or private. Only public GitHub repositories are supported.');
  if (response.status === 403 || response.status === 429)
    throw new RepoError('GitHub rate limit reached. Try again in a few minutes.');
  if (!response.ok) throw new RepoError(`GitHub API error ${response.status} for ${path}`);
  return (await response.json()) as T;
}

async function rawFile(
  owner: string,
  name: string,
  sha: string,
  path: string,
  cap = FILE_BYTES_CAP
): Promise<string | null> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${owner}/${name}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`,
    {
      headers: { 'User-Agent': 'deeply-course-generator' }
    }
  );
  if (!response.ok) return null;
  const text = await response.text();
  if (text.length > cap || text.includes('\u0000')) return null;
  return text;
}

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|rs|go|py|rb|java|kt|swift|c|cc|cpp|h|hpp|cs|ex|exs|scala|zig|lua|php|sql)$/i;
const SKIP =
  /(^|\/)(node_modules|vendor|dist|build|target|\.git|__tests__|tests?|spec|examples?|docs?|fixtures?|benchmarks?|third_party)(\/|$)|\.(min|d)\.\w+$|_test\.|\.test\.|\.spec\./i;

function rankPaths(paths: string[], repoName: string): string[] {
  const score = (path: string) => {
    let points = 0;
    const depth = path.split('/').length;
    points -= Math.abs(depth - 3) * 2;
    if (/(^|\/)(src|lib|crates|packages|pkg|internal|core)\//.test(path)) points += 6;
    if (/(index|main|lib|mod|core|engine|server|client|runtime|store|db|sync|scheduler|router)\.\w+$/i.test(path))
      points += 5;
    if (path.toLowerCase().includes(repoName.toLowerCase())) points += 1;
    return points;
  };
  return [...paths].sort((first, second) => score(second) - score(first));
}

export async function fetchRepoContext(
  owner: string,
  name: string,
  log?: (message: string) => Promise<unknown>
): Promise<RepoContext> {
  const repo = await fetchGitHub<{
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

  const branch = await fetchGitHub<{ commit: { sha: string } }>(
    `/repos/${owner}/${name}/branches/${encodeURIComponent(repo.default_branch)}`
  );
  const sha = branch.commit.sha;
  await log?.(`Pinned ${owner}/${name}@${sha.slice(0, 10)} (${repo.default_branch})`);

  const tree = await fetchGitHub<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(
    `/repos/${owner}/${name}/git/trees/${sha}?recursive=1`
  );
  const blobs = tree.tree.filter((entry) => entry.type === 'blob');
  const languages = Object.keys(
    await fetchGitHub<Record<string, number>>(`/repos/${owner}/${name}/languages`).catch(() => ({}))
  ).slice(0, 6);

  let readme = '';
  const readmePath = blobs.find((blob) => /^readme(\.md|\.rst|\.txt)?$/i.test(blob.path))?.path;
  if (readmePath) readme = ((await rawFile(owner, name, sha, readmePath, 40_000)) ?? '').slice(0, 30_000);

  const candidates = rankPaths(
    blobs
      .filter(
        (blob) =>
          SOURCE_EXT.test(blob.path) &&
          !SKIP.test(blob.path) &&
          (blob.size ?? 0) > 400 &&
          (blob.size ?? 0) < FILE_BYTES_CAP
      )
      .map((blob) => blob.path),
    name
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
    tree: blobs.map((blob) => blob.path).slice(0, 1500),
    files,
    brandDigest
  };
}

async function fetchStylesheets(html: string, pageURL: string): Promise<string> {
  const origin = new URL(pageURL).origin;
  const hrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]
    .map((match) => match[0].match(/href=["']([^"']+)/i)?.[1])
    .flatMap((href) => (href ? [new URL(href, pageURL)] : []))
    .filter((stylesheetURL) => stylesheetURL.origin === origin)
    .slice(0, STYLESHEET_LIMIT);
  const sheets = await Promise.all(
    hrefs.map((stylesheetURL) =>
      fetch(stylesheetURL, { headers: { 'User-Agent': 'Mozilla/5.0 (deeply-course-generator)' } })
        .then((response) => (response.ok ? response.text() : ''))
        .catch(() => '')
    )
  );
  return sheets.map((sheet) => sheet.slice(0, HOMEPAGE_BYTES_CAP)).join('\n');
}

export async function fetchBrandDigest(url: string): Promise<string> {
  const absoluteURL = /^https?:\/\//.test(url) ? url : `https://${url}`;
  const response = await fetch(absoluteURL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (deeply-course-generator)' },
    redirect: 'follow'
  });
  if (!response.ok) return '';
  const html = (await response.text()).slice(0, HOMEPAGE_BYTES_CAP);
  const stylesheets = await fetchStylesheets(html, response.url || absoluteURL);
  const source = `${html}\n${stylesheets}`;
  const count = (pattern: RegExp) => {
    const counts = new Map<string, number>();
    for (const match of source.matchAll(pattern))
      counts.set(match[1].toLowerCase(), (counts.get(match[1].toLowerCase()) ?? 0) + 1);
    return [...counts.entries()].sort((first, second) => second[1] - first[1]);
  };
  const rankedColors = count(/(#[0-9a-fA-F]{6})\b/g);
  const hexes = rankedColors.slice(0, 16).map(([color, occurrences]) => `${color}×${occurrences}`);
  const vars = [
    ...source.matchAll(/(--[\w-]*(?:color|brand|primary|accent|bg|background)[\w-]*)\s*:\s*([^;}{]{3,40})/gi)
  ]
    .filter((match) => !match[1].startsWith('--tw-'))
    .slice(0, 20)
    .map((match) => `${match[1]}: ${match[2].trim()}`);
  const fonts = count(/font-family\s*:\s*([^;}"]{3,80})/gi)
    .slice(0, 6)
    .map(([font]) => font);
  const gfonts = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/g)]
    .map((match) => decodeURIComponent(match[1]).replace(/\+/g, ' '))
    .slice(0, 4);
  const topColors = rankedColors.slice(0, 16);
  const totalOccurrences = topColors.reduce((sum, [, occurrences]) => sum + occurrences, 0);
  const neutralOccurrences = topColors
    .filter(([color]) => isNeutralColor(color))
    .reduce((sum, [, occurrences]) => sum + occurrences, 0);
  const isMonochrome = totalOccurrences > 0 && neutralOccurrences / totalOccurrences >= MONOCHROME_SHARE;
  const theme = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i)?.[1];
  const title = html.match(/<title>([^<]{0,120})/i)?.[1];
  const logo = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+\.svg)/i)?.[1];
  return [
    `homepage: ${absoluteURL}`,
    title && `title: ${title}`,
    theme && `theme-color: ${theme}`,
    hexes.length && `most used hex colours: ${hexes.join(', ')}`,
    isMonochrome &&
      `${MONOCHROME_HINT} (mostly blacks, whites and greys); keep the course monochrome with white or grey accents`,
    vars.length && `css colour variables:\n  ${vars.join('\n  ')}`,
    fonts.length && `font-family declarations: ${fonts.join(' | ')}`,
    gfonts.length && `google fonts loaded: ${gfonts.join(', ')}`,
    logo && `svg icon: ${logo}`
  ]
    .filter(Boolean)
    .join('\n');
}

export type RefRequest = {
  id: string;
  title: string;
  path: string;
  startLine: number;
  endLine: number;
  firstLine?: string;
  symbol: string;
  summary: string;
  explain: string;
  notes?: { line: number; text: string }[];
};

const LANG: Record<string, string> = {
  rs: 'rust',
  ts: 'ts',
  tsx: 'ts',
  js: 'ts',
  jsx: 'ts',
  mjs: 'ts',
  go: 'go',
  py: 'python'
};

export function resolveRef(request: RefRequest, files: RepoFile[], repo: { owner: string; name: string; sha: string }) {
  const file = files.find((file) => file.path === request.path);
  if (!file) return null;
  const lines = file.text.split('\n');
  let start = Math.floor(request.startLine);
  let end = Math.floor(request.endLine);
  if (!(start >= 1 && end >= start)) return null;
  if (request.firstLine && request.firstLine.trim()) {
    const want = request.firstLine.trim();
    if ((lines[start - 1] ?? '').trim() !== want) {
      let best = -1;
      for (let index = 0; index < lines.length; index++) {
        if (lines[index].trim() === want && (best < 0 || Math.abs(index + 1 - start) < Math.abs(best + 1 - start)))
          best = index;
      }
      if (best < 0) return null;
      const shift = best + 1 - start;
      start += shift;
      end += shift;
    }
  }
  end = Math.min(end, lines.length, start + 79);
  if (start > lines.length) return null;
  const code = lines.slice(start - 1, end).join('\n');
  if (!code.trim()) return null;
  const ext = request.path.split('.').pop()?.toLowerCase() ?? '';
  return {
    id: request.id,
    title: request.title,
    repo: `${repo.owner}/${repo.name}`,
    sha: repo.sha,
    path: request.path,
    startLine: start,
    endLine: end,
    symbol: request.symbol,
    lang: LANG[ext] ?? ext,
    summary: request.summary,
    explain: request.explain,
    notes: (request.notes ?? []).filter((note) => note.line >= start && note.line <= end),
    code
  };
}

export function numbered(file: RepoFile, maxLines = 900): string {
  const lines = file.text.split('\n').slice(0, maxLines);
  const lineNumberWidth = String(lines.length).length;
  return lines.map((line, index) => `${String(index + 1).padStart(lineNumberWidth)}| ${line}`).join('\n');
}
