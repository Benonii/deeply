import type { BearerSecretReading } from './types';

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

export function readBearerSecret(authorization: string | null): BearerSecretReading {
  const secret = authorization ? (/^Bearer\s+(.*)$/i.exec(authorization.trim())?.[1] ?? '') : '';
  if (secret.length === 0) return { kind: 'missing' };
  return AGENT_KEY_PATTERN.test(secret) ? { kind: 'present', secret } : { kind: 'malformed' };
}
