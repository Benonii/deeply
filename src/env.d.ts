declare module '*.css';
declare const process: { env: Record<string, string | undefined> };
interface Window {
  dataLayer?: unknown[];
  gtag?: (...parameters: unknown[]) => void;
}
