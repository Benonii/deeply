export function readPlannedModuleId(outline: unknown, moduleNumber: number): string {
  if (outline === null || typeof outline !== 'object' || !('id' in outline)) return `m${moduleNumber}`;
  const { id } = outline;
  return typeof id === 'string' && id.length > 0 ? id : `m${moduleNumber}`;
}

export function countCourseChallenges(meta: unknown): number {
  if (meta === null || typeof meta !== 'object' || !('challenges' in meta)) return 0;
  const { challenges } = meta;
  return Array.isArray(challenges) ? challenges.length : 0;
}
