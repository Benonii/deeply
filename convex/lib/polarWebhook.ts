const encoder = new TextEncoder();
const TOLERANCE_SECONDS = 5 * 60;

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const raw = atob(value);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function encodeBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function importHmacKey(key: Uint8Array<ArrayBuffer>, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

function listCandidateKeys(secret: string): Uint8Array<ArrayBuffer>[] {
  const keys = [encoder.encode(secret)];
  const decoded = decodeBase64(secret.startsWith('whsec_') ? secret.slice(6) : secret);
  if (decoded && decoded.byteLength > 0) keys.push(decoded);
  return keys;
}

async function hasValidSignature(content: Uint8Array<ArrayBuffer>, signatures: string, secret: string) {
  const givenSignatures = signatures
    .split(' ')
    .filter((signature) => signature.startsWith('v1,'))
    .flatMap((signature) => decodeBase64(signature.slice(3)) ?? []);
  for (const key of listCandidateKeys(secret)) {
    const verifier = await importHmacKey(key, 'verify');
    for (const signature of givenSignatures)
      if (await crypto.subtle.verify('HMAC', verifier, signature, content)) return true;
  }
  return false;
}

export async function resignPolarWebhook(request: Request, secret: string): Promise<Request | null> {
  const webhookID = request.headers.get('webhook-id');
  const timestamp = Number(request.headers.get('webhook-timestamp'));
  const signatures = request.headers.get('webhook-signature');
  if (!secret || !webhookID || !signatures || !Number.isFinite(timestamp)) return null;
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return null;

  const body = await request.text();
  const content = encoder.encode(`${webhookID}.${Math.floor(timestamp)}.${body}`);
  if (!(await hasValidSignature(content, signatures, secret))) return null;

  const signer = await importHmacKey(encoder.encode(secret), 'sign');
  const headers = new Headers(request.headers);
  headers.set('webhook-signature', `v1,${encodeBase64(await crypto.subtle.sign('HMAC', signer, content))}`);
  return new Request(request.url, { method: 'POST', headers, body });
}
