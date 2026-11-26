import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CHECK_REGISTRY } from '../checks/registry';
import { pythonGeneratorsMap } from '../lib/fixtures/pythonGeneratorsMap';
import { iteratorProtocolModule, writingGeneratorsModule } from '../lib/fixtures/pythonGeneratorsModules';
import { buildModuleBrief, listGlossaryTerms } from './moduleBrief';

const firstPlan = pythonGeneratorsMap.modules[0];
const secondPlan = pythonGeneratorsMap.modules[1];
const earlierModules = [{ plan: firstPlan, pack: iteratorProtocolModule }];

describe('the agent-stage checks', () => {
  it('each ship the prompt the writing brief hands over', () => {
    const missing = CHECK_REGISTRY.filter(
      (registration) => registration.check.stage === 'agent' && registration.check.prompt === undefined
    ).map((registration) => registration.check.checkId);
    assert.deepEqual(missing, []);
  });
});

describe('the writing brief', () => {
  it('names the objective, the concepts to teach and the quotes behind them', () => {
    const brief = buildModuleBrief({ map: pythonGeneratorsMap, plan: secondPlan, earlierModules });
    assert.match(brief, /module writing-generators \(2 of 2\)/);
    assert.match(brief, /Objective: write a generator that streams a file line by line/);
    assert.match(brief, /### generator-function — generator function \(core\)/);
    assert.match(brief, /claim: "A function which returns a generator object\."/);
    assert.match(brief, /Needs first: iterator, function-call/);
  });

  it('lists the terms earlier modules taught, with the module to link back to', () => {
    const brief = buildModuleBrief({ map: pythonGeneratorsMap, plan: secondPlan, earlierModules });
    assert.match(brief, /- \[\[stopiteration\]\] StopIteration: .*\(taughtIn: iterator-protocol\)/);
  });

  it('warns the writer off concepts a later module teaches', () => {
    const brief = buildModuleBrief({ map: pythonGeneratorsMap, plan: firstPlan, earlierModules: [] });
    assert.match(brief, /Never name these, a later module teaches them: generator function, lazy evaluation/);
    assert.match(brief, /Assumed known, never taught: function call/);
  });

  it('carries the pack schema, the submission schema and every agent check', () => {
    const brief = buildModuleBrief({ map: pythonGeneratorsMap, plan: firstPlan, earlierModules: [] });
    assert.match(brief, /"const":"explainback"/);
    assert.match(brief, /"coldReaderWords"/);
    for (const registration of CHECK_REGISTRY.filter((candidate) => candidate.check.stage === 'agent'))
      assert.match(brief, new RegExp(`### ${registration.check.checkId} \\(version `));
  });
});

describe('the earlier glossary', () => {
  it('stamps every term with the module that taught it', () => {
    const terms = listGlossaryTerms([
      { plan: firstPlan, pack: iteratorProtocolModule },
      { plan: secondPlan, pack: writingGeneratorsModule }
    ]);
    assert.equal(terms.length, 6);
    assert.deepEqual(
      terms.filter((term) => term.id === 'yield').map((term) => term.taughtIn),
      ['writing-generators']
    );
  });
});
