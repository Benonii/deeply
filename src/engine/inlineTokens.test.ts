import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readInlineTokens } from './inlineTokens';

describe('inline marks', () => {
  it('reads a term mark with its own display word', () => {
    assert.deepEqual(readInlineTokens('all [[iterable|iterables]] here'), [
      { kind: 'text', text: 'all ' },
      { kind: 'term', termId: 'iterable', text: 'iterables' },
      { kind: 'text', text: ' here' }
    ]);
  });

  it('reads a bare term mark', () => {
    assert.deepEqual(readInlineTokens('[[iterator]]'), [{ kind: 'term', termId: 'iterator', text: 'iterator' }]);
  });

  it('strips a citation to a placeholder carrying its source id', () => {
    assert.deepEqual(readInlineTokens('raises StopIteration[^py-glossary].'), [
      { kind: 'text', text: 'raises StopIteration' },
      { kind: 'citation', text: 'py-glossary' },
      { kind: 'text', text: '.' }
    ]);
  });

  it('leaves double brackets inside inline code alone', () => {
    assert.deepEqual(readInlineTokens('call `frame[[0]]` on it'), [
      { kind: 'text', text: 'call ' },
      { kind: 'code', text: 'frame[[0]]' },
      { kind: 'text', text: ' on it' }
    ]);
  });

  it('keeps the version 1 marks it already read', () => {
    assert.deepEqual(readInlineTokens('a **bold** and *thin* and [a link](https://example.com) end'), [
      { kind: 'text', text: 'a ' },
      { kind: 'bold', text: 'bold' },
      { kind: 'text', text: ' and ' },
      { kind: 'emphasis', text: 'thin' },
      { kind: 'text', text: ' and ' },
      { kind: 'link', text: 'a link', href: 'https://example.com' },
      { kind: 'text', text: ' end' }
    ]);
  });

  it('leaves text with no marks as one run', () => {
    assert.deepEqual(readInlineTokens('plain words [not a mark] still plain'), [
      { kind: 'text', text: 'plain words [not a mark] still plain' }
    ]);
  });
});
