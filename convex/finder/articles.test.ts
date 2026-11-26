import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractArticleFacts, vetArticleUrls } from './articles';

const html = `<!doctype html><html><head>
<title>Generators &amp; yield</title>
<meta property="og:site_name" content="The Docs">
<meta property="article:published_time" content="2026-03-04T10:00:00Z">
<style>body { color: red }</style>
<script>const noise = 'do not count me at all';</script>
</head><body>
<h1>Generators</h1>
<p>${'word '.repeat(500)}</p>
<pre><code>def counter():\n    yield 1</code></pre>
<pre><code>next(counter())</code></pre>
</body></html>`;

describe('extractArticleFacts', () => {
  it('reads the title, site, date, words and code blocks', () => {
    const facts = extractArticleFacts('https://docs.example/generators', html);
    assert.equal(facts.title, 'Generators & yield');
    assert.equal(facts.site, 'The Docs');
    assert.equal(facts.publishedAt, '2026-03-04T10:00:00Z');
    assert.equal(facts.codeBlockCount, 2);
    assert.ok(facts.wordCount > 500 && facts.wordCount < 520, String(facts.wordCount));
    assert.equal(facts.minutes, 3);
  });

  it('leaves script and style text out of the word count', () => {
    assert.ok(!extractArticleFacts('https://docs.example/a', html).wordCount.toString().includes('NaN'));
    const bare = extractArticleFacts('https://docs.example/a', '<html><body><p>one two three</p></body></html>');
    assert.equal(bare.wordCount, 3);
    assert.equal(bare.minutes, 1);
  });

  it('falls back to the hostname without www when the page names no site', () => {
    const facts = extractArticleFacts('https://www.blog.example/post', '<html><body>text here</body></html>');
    assert.equal(facts.site, 'blog.example');
    assert.equal(facts.title, 'https://www.blog.example/post');
    assert.equal(facts.publishedAt, undefined);
  });

  it('reads a date from a time element or JSON-LD when there is no meta tag', () => {
    const fromTime = extractArticleFacts(
      'https://blog.example/a',
      '<html><body><time datetime="2024-07-07">July</time>text</body></html>'
    );
    assert.equal(fromTime.publishedAt, '2024-07-07');
    const fromJsonLd = extractArticleFacts(
      'https://blog.example/a',
      '<html><head><script type="application/ld+json">{"datePublished":"2023-02-02T00:00:00Z"}</script></head><body>text</body></html>'
    );
    assert.equal(fromJsonLd.publishedAt, '2023-02-02T00:00:00Z');
  });
});

describe('vetArticleUrls', () => {
  const stub = (bodies: Record<string, { status: number; body?: string }>) =>
    (async (input: string | URL | Request) => {
      const url = String(input);
      const answer = bodies[url] ?? { status: 404 };
      return new Response(answer.body ?? null, {
        status: answer.status,
        headers: { 'content-type': 'text/html' }
      });
    }) as unknown as typeof fetch;

  it('keeps pages that answer and drops the rest with a reason', async () => {
    const vetted = await vetArticleUrls(
      ['https://docs.example/generators', 'https://docs.example/missing'],
      stub({ 'https://docs.example/generators': { status: 200, body: html } })
    );
    assert.deepEqual(
      vetted.candidates.map((page) => page.url),
      ['https://docs.example/generators']
    );
    assert.deepEqual(vetted.rejected, [{ target: 'https://docs.example/missing', reason: 'status 404' }]);
  });

  it('drops a page with no readable text', async () => {
    const vetted = await vetArticleUrls(
      ['https://docs.example/empty'],
      stub({ 'https://docs.example/empty': { status: 200, body: '<html><body><img src="x"></body></html>' } })
    );
    assert.deepEqual(vetted.rejected, [
      { target: 'https://docs.example/empty', reason: 'the page has no readable text' }
    ]);
  });

  it('drops a value that is not an http URL before any fetch', async () => {
    const vetted = await vetArticleUrls(['not a url', 'ftp://docs.example/a'], stub({}));
    assert.equal(vetted.candidates.length, 0);
    assert.match(vetted.rejected[0].reason, /not a URL/);
    assert.equal(vetted.rejected[1].reason, 'unsupported scheme ftp:');
  });

  it('fetches a repeated URL once', async () => {
    const seen: string[] = [];
    const counting = (async (input: string | URL | Request) => {
      seen.push(String(input));
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
    }) as unknown as typeof fetch;
    const vetted = await vetArticleUrls(
      ['https://docs.example/generators', 'https://docs.example/generators'],
      counting
    );
    assert.equal(seen.length, 1);
    assert.equal(vetted.candidates.length, 1);
  });
});
