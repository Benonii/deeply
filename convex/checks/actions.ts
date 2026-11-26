import { v } from 'convex/values';

import { internalAction } from '../_generated/server';
import { decideModuleFate, runChecks } from './runner';
import { CheckRequest } from './validators';

export const runModuleChecks = internalAction({
  args: { request: v.any() },
  handler: async (_context, { request }) => {
    const parsed = CheckRequest.safeParse(request);
    if (!parsed.success)
      return { data: null, message: `the check request does not match the schema: ${parsed.error.message}` };
    const { attempt, stages, ...input } = parsed.data;
    const run = await runChecks(input, { stages });
    const verdict = decideModuleFate({ results: run.results, attempt });
    return {
      data: { ...run, attempt, verdict },
      message: `module ${input.pack.id} attempt ${attempt}: ${verdict.kind}`
    };
  }
});
