const SECRET_BYTES = 24;
const SECRET_LABEL = 'dk_';
const DISPLAYED_SECRET_CHARACTERS = 6;

export const AGENT_KEY_PATTERN = new RegExp(`^${SECRET_LABEL}[0-9a-f]{${SECRET_BYTES * 2}}$`);

export const AGENT_KEY_NAME_MAX_LENGTH = 60;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function createAgentKeySecret(): string {
  return `${SECRET_LABEL}${toHex(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)))}`;
}

export async function hashAgentKeySecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return toHex(new Uint8Array(digest));
}

export function readAgentKeyPrefix(secret: string): string {
  return secret.slice(0, SECRET_LABEL.length + DISPLAYED_SECRET_CHARACTERS);
}

export function readBearerSecret(authorization: string | null): string | null {
  const match = authorization ? /^Bearer\s+(\S+)$/i.exec(authorization) : null;
  const secret = match?.[1] ?? null;
  return secret && AGENT_KEY_PATTERN.test(secret) ? secret : null;
}
