export const PRODUCTION_CONVEX_URL = 'https://focused-retriever-45.convex.cloud';
export const PRODUCTION_WEB_URL = 'https://learndeeply.vercel.app';

export function readConvexURL(): string {
  return process.env.CONVEX_URL ?? PRODUCTION_CONVEX_URL;
}

export function deriveConvexSiteURL(convexURL: string): string {
  return convexURL.replace(/\.convex\.cloud\/?$/, '.convex.site');
}
