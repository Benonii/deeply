import { createEndpoint } from '@farm.js/core/api';
import skillMarkdown from '../../../../skill/deeply/SKILL.md?raw';

export const GET = createEndpoint(
  async () =>
    new Response(skillMarkdown, {
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'content-disposition': 'attachment; filename="SKILL.md"'
      }
    })
);
