import { navigateTo } from '@farm.js/core/client';

const LEGACY_COURSE_PATH = /^\/(m\/[\w-]+|playground|lab|source)$/;

function mapLegacyCoursePath(path: string) {
  const match = path.match(LEGACY_COURSE_PATH);
  if (!match) return path;
  return match[1].startsWith('m/') ? `/c/convex/${match[1]}` : `/c/convex/p/${match[1]}`;
}

export function redirectLegacyHashURL() {
  if (!location.hash.startsWith('#/')) return;
  const [path, query] = location.hash.slice(1).split('?');
  const search = query ? `?${query}` : '';
  navigateTo(`${mapLegacyCoursePath(path)}${search}`, { replace: true });
}
