export const PRODUCTION_CONVEX_URL = 'https://focused-retriever-45.convex.cloud';
export const PRODUCTION_WEB_URL = 'https://learndeeply.vercel.app';

export function isDesktopTarget(): boolean {
  return process.env.FARM_PLATFORM === 'desktop';
}

export function readConvexURL(): string {
  if (isDesktopTarget()) return process.env.DEEPLY_DESKTOP_CONVEX_URL ?? PRODUCTION_CONVEX_URL;
  return process.env.CONVEX_URL ?? PRODUCTION_CONVEX_URL;
}

export function deriveConvexSiteURL(convexURL: string): string {
  const cloudSiteURL = convexURL.replace(/\.convex\.cloud\/?$/, '.convex.site');
  if (cloudSiteURL !== convexURL) return cloudSiteURL;
  return process.env.CONVEX_SITE_URL ?? cloudSiteURL;
}
