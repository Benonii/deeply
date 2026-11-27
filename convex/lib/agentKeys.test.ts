import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createAgentKeySecret, readBearerSecret } from './agentKeys';

describe('readBearerSecret', () => {
  it('reads a well-formed key from a bearer header', () => {
    const secret = createAgentKeySecret();
    assert.deepEqual(readBearerSecret(`Bearer ${secret}`), { kind: 'present', secret });
    assert.deepEqual(readBearerSecret(`bearer   ${secret}`), { kind: 'present', secret });
  });

  it('calls a header with no key missing', () => {
    for (const header of [null, '', 'Bearer', 'Bearer   ', 'Basic dXNlcjpwYXNz'])
      assert.deepEqual(readBearerSecret(header), { kind: 'missing' }, String(header));
  });

  it('calls a key in the wrong shape malformed', () => {
    for (const header of [
      'Bearer dk_notarealkey',
      `Bearer ${createAgentKeySecret()}x`,
      'Bearer dk_abc def',
      'Bearer sk-123'
    ])
      assert.deepEqual(readBearerSecret(header), { kind: 'malformed' }, header);
  });
});
