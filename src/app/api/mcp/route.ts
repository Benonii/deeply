import { createEndpoint } from '@farm.js/core/api';
import { deriveConvexSiteURL, readConvexURL } from '@/lib/deployment';

const FORWARDED_HEADERS = ['authorization', 'content-type', 'accept', 'mcp-protocol-version'];

export const POST = createEndpoint(async ({ request }) => {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return fetch(`${deriveConvexSiteURL(readConvexURL())}/mcp`, {
    method: 'POST',
    headers,
    body: await request.text()
  });
});
