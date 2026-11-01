import { PRODUCTION_WEB_URL } from './deployment';

const PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIRING_CODE_LENGTH = 24;
const CHECK_CODE_LENGTH = 8;

export const DESKTOP_CONNECT_PATH = '/desktop/connect';

export function createPairingCode(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(PAIRING_CODE_LENGTH));
  return Array.from(randomValues, (value) => PAIRING_ALPHABET[value % PAIRING_ALPHABET.length]).join('');
}

export function formatCheckCode(pairingCode: string): string {
  const checkCode = pairingCode.slice(0, CHECK_CODE_LENGTH);
  return `${checkCode.slice(0, CHECK_CODE_LENGTH / 2)}-${checkCode.slice(CHECK_CODE_LENGTH / 2)}`;
}

export function buildConnectURL(pairingCode: string): string {
  return `${PRODUCTION_WEB_URL}${DESKTOP_CONNECT_PATH}?code=${pairingCode}`;
}

export function readPairingCodeFromURL(): string {
  return new URLSearchParams(location.search).get('code') ?? '';
}
