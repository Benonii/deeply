import { describeFailure, fetchWithTimeout, isLive } from '../lib/webFetch';
import { finderThresholds } from './weights';
import type { ArticleCandidate, RejectedTarget } from './types';

const STRIPPED_ELEMENTS = /<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi;

const TAG = /<[^>]+>/g;

const META = /<meta\b[^>]*>/gi;

const ATTRIBUTE = /([a-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

const TITLE_ELEMENT = /<title\b[^>]*>([\s\S]*?)<\/title>/i;

const TIME_ELEMENT = /<time\b[^>]*\bdatetime\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

const JSON_LD_DATE = /"datePublished"\s*:\s*"([^"]+)"/i;

const MARKUP = /<(?:html|body|div|p|article|section)\b/i;

const TEXT_DIRECTIVE = /^\.\./;

const TEXT_DECORATION = /^([=\-*~^#"'`+:_])\1{2,}$/;

const FENCE = /^\s*```/gm;

const DIRECTIVE = /^\s*(?:\.\.\s+code-block::|\.\.\s+code::)/gm;

const PUBLISHED_META_KEYS = new Set([
  'article:published_time',
  'article:published',
  'datepublished',
  'date',
  'dc.date',
  'dc.date.issued',
  'pubdate',
  'parsely-pub-date',
  'citation_publication_date'
]);

const unescapeHtml = (text: string) =>
  text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

function readMetaValues(html: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const tag of html.match(META) ?? []) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(ATTRIBUTE))
      attributes.set(match[1].toLowerCase(), unescapeHtml(match[2] ?? match[3] ?? ''));
    const name = attributes.get('property') ?? attributes.get('name') ?? attributes.get('itemprop');
    const content = attributes.get('content');
    if (name === undefined || content === undefined || content.length === 0) continue;
    if (!found.has(name.toLowerCase())) found.set(name.toLowerCase(), content);
  }
  return found;
}

function readPublishedDate(html: string, meta: Map<string, string>): string | undefined {
  for (const key of PUBLISHED_META_KEYS) {
    const value = meta.get(key);
    if (value !== undefined && !Number.isNaN(Date.parse(value))) return value;
  }
  const timeMatch = TIME_ELEMENT.exec(html);
  const timeValue = timeMatch === null ? undefined : (timeMatch[1] ?? timeMatch[2]);
  if (timeValue !== undefined && !Number.isNaN(Date.parse(timeValue))) return timeValue;
  const jsonMatch = JSON_LD_DATE.exec(html);
  if (jsonMatch !== null && !Number.isNaN(Date.parse(jsonMatch[1]))) return jsonMatch[1];
  return undefined;
}

function readPlainTextTitle(text: string): string {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || TEXT_DIRECTIVE.test(trimmed) || TEXT_DECORATION.test(trimmed)) continue;
    return trimmed.replace(/^#{1,6}\s*/, '').slice(0, 120);
  }
  return '';
}

function readPlainTextFacts(url: string, text: string): ArticleCandidate {
  const title = readPlainTextTitle(text);
  const words = text.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word));
  return {
    url,
    title: title.length === 0 ? url : unescapeHtml(title),
    site: new URL(url).hostname.replace(/^www\./, ''),
    publishedAt: undefined,
    wordCount: words.length,
    codeBlockCount: Math.floor((text.match(FENCE) ?? []).length / 2) + (text.match(DIRECTIVE) ?? []).length,
    minutes: Math.max(1, Math.ceil(words.length / finderThresholds.articleWordsPerMinute))
  };
}

export function extractArticleFacts({
  url,
  body,
  contentType
}: {
  url: string;
  body: string;
  contentType?: string;
}): ArticleCandidate {
  const servedAsHtml = contentType === undefined ? MARKUP.test(body) : contentType.includes('html');
  if (!servedAsHtml) return readPlainTextFacts(url, body);
  const html = body;
  const meta = readMetaValues(html);
  const titleMatch = TITLE_ELEMENT.exec(html);
  const title =
    meta.get('og:title') ??
    (titleMatch === null ? undefined : unescapeHtml(titleMatch[1])) ??
    meta.get('twitter:title') ??
    url;
  const readable = html.replace(STRIPPED_ELEMENTS, ' ');
  const words = unescapeHtml(readable.replace(TAG, ' '))
    .split(' ')
    .filter((word) => /[a-z0-9]/i.test(word));
  const preCount = (readable.match(/<pre\b/gi) ?? []).length;
  const codeBlockCount = preCount > 0 ? preCount : (readable.match(/<code\b/gi) ?? []).length;
  return {
    url,
    title: title.length === 0 ? url : title,
    site: meta.get('og:site_name') ?? new URL(url).hostname.replace(/^www\./, ''),
    publishedAt: readPublishedDate(html, meta),
    wordCount: words.length,
    codeBlockCount,
    minutes: Math.max(1, Math.ceil(words.length / finderThresholds.articleWordsPerMinute))
  };
}

export async function vetArticleUrl(
  url: string,
  fetchResponse: typeof fetch
): Promise<{ kind: 'kept'; candidate: ArticleCandidate } | { kind: 'rejected'; rejection: RejectedTarget }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return { kind: 'rejected', rejection: { target: url, reason: `not a URL: ${describeFailure(error)}` } };
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:')
    return { kind: 'rejected', rejection: { target: url, reason: `unsupported scheme ${parsedUrl.protocol}` } };
  try {
    const response = await fetchWithTimeout(url, {
      fetchResponse,
      timeoutMs: finderThresholds.requestTimeoutMs,
      accept: 'text/html,application/xhtml+xml'
    });
    if (!isLive(response.status)) {
      await response.body?.cancel().catch(() => undefined);
      return { kind: 'rejected', rejection: { target: url, reason: `status ${response.status}` } };
    }
    const body = (await response.text()).slice(0, finderThresholds.maxArticleBytes);
    const candidate = extractArticleFacts({
      url: response.url.length > 0 ? response.url : url,
      body,
      contentType: response.headers.get('content-type') ?? undefined
    });
    if (candidate.wordCount === 0)
      return { kind: 'rejected', rejection: { target: url, reason: 'the page has no readable text' } };
    return { kind: 'kept', candidate };
  } catch (error) {
    return { kind: 'rejected', rejection: { target: url, reason: `the request failed (${describeFailure(error)})` } };
  }
}

export async function vetArticleUrls(
  urls: string[],
  fetchResponse: typeof fetch
): Promise<{ candidates: ArticleCandidate[]; rejected: RejectedTarget[] }> {
  const candidates: ArticleCandidate[] = [];
  const rejected: RejectedTarget[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    const verdict = await vetArticleUrl(url, fetchResponse);
    if (verdict.kind === 'kept') candidates.push(verdict.candidate);
    else rejected.push(verdict.rejection);
  }
  return { candidates, rejected };
}
