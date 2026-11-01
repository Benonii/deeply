import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { appDataDir } from '@farm.js/core/platform';

const SESSION_FILE_NAME = 'session-cookies.json';

let storedCookies: Record<string, string> | null = null;

function readSessionFilePath(): string {
  return join(appDataDir(), SESSION_FILE_NAME);
}

function loadStoredCookies(): Record<string, string> {
  if (storedCookies) return storedCookies;
  try {
    storedCookies = JSON.parse(readFileSync(readSessionFilePath(), 'utf8')) as Record<string, string>;
  } catch {
    storedCookies = {};
  }
  return storedCookies;
}

function saveStoredCookies(cookies: Record<string, string>) {
  storedCookies = cookies;
  writeFileSync(readSessionFilePath(), JSON.stringify(cookies), { mode: 0o600 });
}

function isExpiredCookie(attributes: string[]): boolean {
  return attributes.some((attribute) => {
    const [name, value = ''] = attribute.trim().split('=');
    if (name.toLowerCase() === 'max-age') return Number(value) <= 0;
    if (name.toLowerCase() === 'expires') return Date.parse(value) <= Date.now();
    return false;
  });
}

export function storeResponseCookies(response: Response) {
  const setCookieHeaders = response.headers.getSetCookie();
  if (setCookieHeaders.length === 0) return;
  const cookies = { ...loadStoredCookies() };
  setCookieHeaders.forEach((setCookieHeader) => {
    const [pair, ...attributes] = setCookieHeader.split(';');
    const separatorIndex = pair.indexOf('=');
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) return;
    if (!value || isExpiredCookie(attributes)) delete cookies[name];
    else cookies[name] = value;
  });
  saveStoredCookies(cookies);
}

export function buildCookieHeader(): string | undefined {
  const cookies = Object.entries(loadStoredCookies());
  if (cookies.length === 0) return undefined;
  return cookies.map(([name, value]) => `${name}=${value}`).join('; ');
}
