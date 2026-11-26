import { createEndpoint } from '@farm.js/core/api';
import { buildZip } from '@/lib/zip';

import type { ZipEntry } from '@/lib/zip';

const SKILL_ROOT = 'skill/deeply/';

const skillFiles = import.meta.glob('../../../../skill/deeply/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

function listEntries(): ZipEntry[] {
  return Object.entries(skillFiles)
    .map(([path, contents]) => ({
      path: `deeply/${path.slice(path.indexOf(SKILL_ROOT) + SKILL_ROOT.length)}`,
      contents: Buffer.from(contents, 'utf8')
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

const archive = buildZip(listEntries());

export const GET = createEndpoint(
  async () =>
    new Response(new Uint8Array(archive), {
      headers: {
        'content-type': 'application/zip',
        'content-length': String(archive.length),
        'content-disposition': 'attachment; filename="deeply-skill.zip"'
      }
    })
);
