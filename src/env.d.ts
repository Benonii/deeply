declare module '*.css';
declare module '*.md?raw' {
  const markdown: string;
  export default markdown;
}
declare const process: { env: Record<string, string | undefined> };
interface Window {
  dataLayer?: unknown[];
  gtag?: (...parameters: unknown[]) => void;
}
