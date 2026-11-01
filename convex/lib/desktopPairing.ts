export const PAIRING_CODE_PATTERN = /^[A-Z2-9]{24}$/;
export const PAIRING_LIFETIME_MILLISECONDS = 3 * 60 * 1000;

export async function hashPairingCode(pairingCode: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pairingCode));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
