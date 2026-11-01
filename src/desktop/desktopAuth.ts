import { platform } from '@farm.js/core/platform';
import { exchangeOneTimeToken, fetchDesktopConvexToken, forwardDesktopAuthRequest } from './authForwarding';

import type { ConvexBetterAuth } from '../types';

export function isDesktop(): boolean {
  return platform() === 'desktop';
}

export function withDesktopSession(webAuth: ConvexBetterAuth, siteURL: string): ConvexBetterAuth {
  return {
    ...webAuth,
    handler: (request) => (isDesktop() ? forwardDesktopAuthRequest(request, siteURL) : webAuth.handler(request)),
    token: (request) => (isDesktop() ? fetchDesktopConvexToken(siteURL) : webAuth.token(request))
  };
}

export function signInDesktop(oneTimeToken: string, siteURL: string): Promise<boolean> {
  return exchangeOneTimeToken(oneTimeToken, siteURL);
}
