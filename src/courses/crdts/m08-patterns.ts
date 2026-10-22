import type { ModulePack } from '../../../convex/lib/courseSchema';
import { callout, check, code, compare, flow, p, section, terms, ul, h3 } from './b';

export const m08: ModulePack = {
  id: 'patterns',
  n: 8,
  title: 'Patterns, pitfalls & when not to use CRDTs',
  kicker: 'Intent, invariants, OT, server-authoritative and hybrid designs',
  minutes: 30,
  summary:
    'CRDTs guarantee convergence, not correctness. This module covers where they surprise people, which invariants they fundamentally cannot protect, and how to combine them with server-authoritative designs.',
  sections: [
    section(
      'intent',
      'Converged, but not what anyone meant',
      p(
        'Most CRDT bugs in production are not divergence. They are merges that every replica agrees on and every user dislikes. Common ones:'
      ),
      ul(
        '**Move as delete + insert**: dragging a list item is often implemented as "delete at old position, insert at new". Two users concurrently move the same item to different places, and the merge contains two copies. A real move operation (Kleppmann 2020, "Moving elements in list CRDTs"; Loro\'s movable list) keeps one item with an LWW position.',
        '**Edit vs delete**: Alice deletes a task while Bob edits its title. Depending on the design the edit is lost, or the task is resurrected with only Bob\'s field. Decide which you want and test it.',
        '**Concurrent container creation**: both users create `doc.settings = {}` and fill it (module 6). One object wins; the other\'s fields vanish.',
        '**LWW on rich data**: concurrent edits to a whole JSON blob stored in one register drop one side completely. Store fields separately so they merge independently.',
        '**Interleaving**: concurrent text runs merged character by character (module 5).'
      ),
      callout(
        'rule',
        'Write the conflict table first',
        'Before choosing types, list every pair of operations two users could do concurrently (edit/edit, edit/delete, move/move, move/delete...) and write down the outcome you want. Then pick or design types that produce those outcomes, and turn the table into tests.'
      ),
      check(
        'Two users concurrently drag the same card to different columns. Your app implements moves as delete-then-insert in a list CRDT. What happens after merge?',
        ['The card ends up in one column', 'The card appears twice, once in each column', 'The card disappears', 'The merge fails'],
        1,
        'Both deletes remove the one original element (idempotently), and both inserts add a new element, so two copies remain. A move operation that updates a single position register avoids this.'
      )
    ),
    section(
      'invariants',
      'Invariants CRDTs cannot protect',
      p(
        'Bailis et al. ("Coordination Avoidance in Database Systems", VLDB 2014) gave a precise test called **invariant confluence** (I-confluence): an invariant can be preserved without coordination only if merging any two states that each satisfy it always yields a state that still satisfies it. If not, some concurrent pair of valid local operations will produce an invalid merged state, and no merge function can fix that without throwing away a user\'s work.'
      ),
      compare(
        'Which invariants survive coordination-free merging',
        ['Invariant', 'With these operations', 'I-confluent?', 'Why'],
        ['Count ≥ 0', 'increments only', 'Yes', 'Merging two non-negative counts that only grew stays non-negative'],
        ['Count ≥ 0', 'decrements', 'No', 'Two replicas each take the last unit: −1 after merge'],
        ['Unique ids', 'ids from (replica, counter)', 'Yes', 'Generated ids can\'t collide'],
        ['Unique usernames', 'users choose names', 'No', 'Two replicas accept the same name concurrently'],
        ['Foreign key', 'insert children only', 'Yes', 'Parents are never removed'],
        ['Foreign key', 'delete parents', 'No', 'A child added concurrently with its parent\'s deletion dangles'],
        ['Value ≤ limit', 'increments', 'No', 'Each side stays under the limit; the sum exceeds it']
      ),
      callout(
        'insight',
        'Coordination is sometimes the product',
        'Selling the last seat on a flight, claiming a username, transferring money: these are exactly the operations where users expect "one of you got it, the other didn\'t". That outcome requires someone to see both requests and decide. Use a CRDT where any outcome of concurrency is acceptable, and coordinate where it isn\'t.'
      ),
      check(
        'Which invariant can a CRDT preserve without any coordination?',
        ['A wallet balance never goes below zero under withdrawals', 'Every comment references an existing post, and posts can be deleted', 'Ids generated as (replicaId, counter) are unique', 'At most 10 people can RSVP'],
        2,
        'Locally generated (replica, counter) ids are unique by construction, so merging never creates a duplicate. The others all have concurrent operation pairs that are each valid locally but invalid together.'
      )
    ),
    section(
      'escrow',
      'Escrow: coordinate rarely, not never',
      p(
        'Some invariants can be made cheap instead of free. The **bounded counter** (Balegas et al., 2015) protects "stock ≥ 0" by splitting the available quantity into **rights** held by replicas. A replica can decrement locally only while it holds rights. Running out requires asking another replica to transfer some, which needs that replica to be reachable, but the common case stays local.'
      ),
      code(
        'ts',
        'bounded-counter.ts',
        `
/** Escrow-style counter: stock >= 0 is guaranteed because each replica
 *  may only spend rights it holds. Transfers are the only coordination. */
export class BoundedCounter {
  constructor(public me: string, public rights: Record<string, number>) {}

  get localRights() {
    return this.rights[this.me] ?? 0;
  }
  get total() {
    return Object.values(this.rights).reduce((a, b) => a + b, 0);
  }

  /** Local, offline-safe: succeeds only within our own rights. */
  decrement(n = 1): boolean {
    if (this.localRights < n) return false; // must ask a peer for rights first
    this.rights[this.me] -= n;
    return true;
  }

  /** Needs a message to the peer, but no global consensus. */
  transferTo(peer: string, n: number): boolean {
    if (this.localRights < n) return false;
    this.rights[this.me] -= n;
    this.rights[peer] = (this.rights[peer] ?? 0) + n;
    return true;
  }
}

// 10 seats split 5/5 between two offline box offices: neither can oversell.
const north = new BoundedCounter('north', { north: 5, south: 5 });
`,
        'Simplified for clarity: a production bounded counter is itself a CRDT (per-replica increments, decrements and a transfer matrix, each only growing) so that rights state also merges safely.'
      ),
      p(
        'The same idea scales up as **reservations**: give each region or device a block of ids, seats or budget ahead of time; spend locally; refill from a coordinator when low.'
      )
    ),
    section(
      'ot-server',
      'OT and server-authoritative sync',
      p(
        '**Operational transformation** (Ellis and Gibbs 1989; Jupiter 1995; Google Docs) sends index-based ops ("insert at 5") and transforms each incoming op against concurrent ones so it still means the same thing. Practical OT systems rely on a **central server** that defines one order of ops; each client transforms its pending ops against what the server confirmed. That makes OT simple to reason about with a server, and hard without one: decentralized OT algorithms have a history of subtle bugs.'
      ),
      flow({
        title: 'OT with a central server',
        nodes: [
          { id: 'a', label: 'Client A', sub: 'insert "x" @2', col: 0, row: 0, tone: 'yellow' },
          { id: 'b', label: 'Client B', sub: 'delete @0', col: 0, row: 2, tone: 'purple' },
          { id: 'srv', label: 'Server', sub: 'orders ops', col: 2, row: 1, tone: 'red' },
          { id: 't', label: 'Transform', sub: 'insert "x" @1', col: 3, row: 0, tone: 'plain' },
          { id: 'ack', label: 'Broadcast', sub: 'rev 41, rev 42', col: 4, row: 1, tone: 'red' },
        ],
        edges: [
          { id: 'e1', from: 'a', to: 'srv', label: 'rev 40' },
          { id: 'e2', from: 'b', to: 'srv', label: 'rev 40' },
          { id: 'e3', from: 'srv', to: 't' },
          { id: 'e4', from: 't', to: 'ack' },
        ],
        steps: [
          { title: 'Both edit revision 40', text: 'A inserts "x" at index 2. B deletes index 0. Both ops were made against revision 40.', nodes: ['a', 'b'] },
          { title: 'Server picks an order', text: 'B\'s delete arrives first and becomes revision 41.', nodes: ['srv'], edges: ['e2'] },
          { title: 'Transform the late op', text: 'A\'s insert was based on revision 40, but revision 41 deleted a character before index 2. The server transforms it to insert at index 1, preserving A\'s intent.', nodes: ['t'], edges: ['e1', 'e3'] },
          { title: 'Broadcast in order', text: 'Clients receive revisions 41 and 42 in order. A, which already applied its own insert at 2 locally, transforms the incoming delete against its pending op instead.', nodes: ['ack'], edges: ['e4'] },
          { title: 'The dependency', text: 'All of this hinges on one ordering authority. Without the server, every pair of clients would need to agree on transformations, which is where OT gets hard.', nodes: ['srv'] },
        ],
      }),
      p(
        '**Server-authoritative sync engines** (Convex, Firebase, Replicache/Zero, Linear\'s engine) go further: the server runs every write as a transaction against the one true state, can check any invariant, and pushes results to clients. Clients apply optimistic updates locally and **rebase** them when the server\'s result arrives. In Convex, for example, mutations are serializable transactions using optimistic concurrency control, and queries are reactive, so every client sees a consistent snapshot. There is nothing to merge, because writes never fork.'
      ),
      compare(
        'Three ways to build collaborative apps',
        ['', 'CRDT (local-first)', 'OT', 'Server-authoritative (e.g. Convex)'],
        ['Offline writes', 'First-class, final immediately', 'Queued; transformed on reconnect', 'Optimistic only; may be rejected'],
        ['Needs a server', 'No (but usually has one)', 'Yes, in practice', 'Yes'],
        ['Enforce any invariant', 'No (only I-confluent ones)', 'Partly (server sees order)', 'Yes, in transactions'],
        ['Merge logic lives in', 'Data types on every replica', 'Transformation functions', 'Your mutation code on the server'],
        ['Metadata cost', 'Ids, tombstones, history', 'Op log on server', 'Low on clients'],
        ['Best at', 'Text/docs, offline-first, P2P', 'Text with a central server', 'Business data, permissions, multi-user apps']
      ),
      check(
        'A team task tracker needs offline edits, but also "an assignee must be a current team member" and per-field permissions. Which design fits best?',
        ['Pure peer-to-peer CRDTs', 'Server-authoritative data with optimistic updates, plus a CRDT only for long-form description text', 'OT for every field', 'LWW for everything'],
        1,
        'The membership invariant and permissions need a server that can validate. Collaborative rich text is where CRDTs shine, so embed one there. That hybrid is common in production.'
      )
    ),
    section(
      'hybrid',
      'Hybrid designs',
      flow({
        title: 'Server-authoritative app with an embedded CRDT field',
        nodes: [
          { id: 'ui', label: 'Client', sub: 'task form + editor', col: 0, row: 1, tone: 'yellow' },
          { id: 'mut', label: 'Mutation', sub: 'title, assignee', col: 1, row: 0, tone: 'red' },
          { id: 'ydoc', label: 'Y.Doc', sub: 'description text', col: 1, row: 2, tone: 'purple' },
          { id: 'tx', label: 'Transaction', sub: 'validate + commit', col: 3, row: 0, tone: 'red' },
          { id: 'relay', label: 'Doc sync', sub: 'per-task room', col: 3, row: 2, tone: 'purple' },
          { id: 'store', label: 'Database', sub: 'row + doc bytes', col: 4, row: 1, tone: 'plain' },
        ],
        edges: [
          { id: 'e1', from: 'ui', to: 'mut' },
          { id: 'e2', from: 'ui', to: 'ydoc' },
          { id: 'e3', from: 'mut', to: 'tx', label: 'may reject' },
          { id: 'e4', from: 'ydoc', to: 'relay', label: 'updates' },
          { id: 'e5', from: 'tx', to: 'store' },
          { id: 'e6', from: 'relay', to: 'store', label: 'compacted' },
        ],
        steps: [
          { title: 'Split by field', text: 'Structured fields (title, assignee, status) and the long-form description are edited through different paths.', nodes: ['ui'] },
          { title: 'Structured fields are mutations', text: 'Changing the assignee calls a server mutation, applied optimistically on the client.', nodes: ['mut'], edges: ['e1'] },
          { title: 'The server validates', text: 'The transaction checks the assignee is a current member and the user may edit the task. Invalid writes are rejected and the optimistic change is rolled back.', nodes: ['tx'], edges: ['e3'] },
          { title: 'Text is a CRDT', text: 'The description is a Y.Doc. Keystrokes merge without coordination, work offline, and never get rejected. Access is checked once, when joining the task\'s room.', nodes: ['ydoc', 'relay'], edges: ['e2', 'e4'] },
          { title: 'One database', text: 'Both end up in the same row: normal columns, plus the compacted Yjs update as bytes. Search indexing can read a plain-text projection of the document.', nodes: ['store'], edges: ['e5', 'e6'] },
        ],
      }),
      ul(
        '**Server reconciliation** (Replicache, Zero): clients run mutations locally for instant UI, the server re-runs the same mutations authoritatively, and clients rebase pending mutations on the server\'s state. You get offline-tolerant UX with server-checked invariants, at the cost of possible rejections.',
        '**CRDT with a server tiebreak**: let clients merge freely, but have the server periodically validate the merged document and append corrective changes (for example, removing a duplicate username). Users may see the correction appear.',
        '**Escrow / reservations** (above): pre-allocate scarce resources to replicas.'
      )
    ),
    section(
      'testing',
      'Test convergence, then test intent',
      p(
        'CRDT code is unusually well suited to property-based testing. Generate random operations on several replicas, deliver them in random orders with duplicates, and assert two properties: replicas converge, and the result satisfies your conflict table.'
      ),
      code(
        'ts',
        'or-set.property.test.ts',
        `
import fc from 'fast-check';
import { add, empty, has, merge, remove, type ORSet } from './or-set';

type Op = { replica: number; kind: 'add' | 'remove'; x: string };

const opArb = fc.record({
  replica: fc.integer({ min: 0, max: 2 }),
  kind: fc.constantFrom<'add' | 'remove'>('add', 'remove'),
  x: fc.constantFrom('a', 'b', 'c'),
});

test('OR-Set replicas converge under any merge order', () => {
  fc.assert(
    fc.property(fc.array(opArb, { maxLength: 40 }), fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 6 }), (ops, order) => {
      const replicas: ORSet<string>[] = [empty(), empty(), empty()];
      ops.forEach((op, i) => {
        const r = replicas[op.replica];
        replicas[op.replica] = op.kind === 'add' ? add(r, op.x, \`\${op.replica}:\${i}\`) : remove(r, op.x);
        // Occasionally gossip to a random peer mid-stream.
        const peer = order[i % order.length];
        replicas[peer] = merge(replicas[peer], replicas[op.replica]);
      });
      // Final full exchange in a random order.
      const all = order.reduce((acc, i) => merge(acc, replicas[i]), merge(merge(replicas[0], replicas[1]), replicas[2]));
      const final = replicas.map((r) => merge(r, all));
      for (const x of ['a', 'b', 'c']) {
        const seen = final.map((r) => has(r, x));
        expect(new Set(seen).size).toBe(1); // everyone agrees
      }
    }),
  );
});
`,
        'Uses fast-check and a Jest/Vitest-style test runner. The OR-Set import is the implementation from module 3.'
      ),
      check(
        'Your property test shows replicas always converge, but users report lost edits. What is the most likely gap?',
        [
          'The test runs too few iterations',
          'The test checks convergence but not intent: the agreed state can still drop edits',
          'Property tests cannot test CRDTs',
          'The CRDT is not idempotent',
        ],
        1,
        'Convergence says nothing about whether the result is what users wanted (LWW converges while dropping writes). Add assertions from your conflict table, such as "a concurrent edit and delete keeps the edit".'
      )
    ),
    section(
      'pitfalls',
      'Operational pitfalls',
      ul(
        '**Reused replica ids**: Yjs and Automerge assume each live session has a unique client or actor id. Restoring the same id in two tabs, or copying a stored document with its id to another device, can produce two different items with the same id, which corrupts merges. Let the library generate ids per session.',
        '**Trusting client clocks**: LWW with wall-clock timestamps lets a device with a clock set to 2099 win every conflict forever. Use HLCs or Lamport clocks, and bound accepted skew on the server.',
        '**Unbounded growth**: history, tombstones and per-replica metadata grow. Watch document size in production and plan compaction or snapshots early.',
        '**Huge single documents**: one document per workspace is convenient until it holds 50 MB and every client must load it. Split along natural boundaries (page, file, task).',
        '**Load time**: some libraries replay history on load. Store snapshots, and measure cold-start time on low-end phones.',
        '**Assuming the server can fix things**: once a client accepted an edit, it is final there. Server-side "corrections" are just more concurrent edits.'
      ),
      check(
        'Why must a Yjs client id be unique per live session?',
        ['It is used as the encryption key', 'Items are identified by (clientID, clock); two sessions sharing an id can create different items with the same id', 'The server rejects duplicates', 'Awareness requires it'],
        1,
        'Two sessions with one clientID would both issue clock 57 for different content. Replicas then disagree on what item (id, 57) is, breaking convergence.'
      )
    ),
    section(
      'cheatsheet',
      'Course cheat sheet',
      terms(
        ['SEC', 'Same updates delivered → same state, no resolution round.'],
        ['Causality', 'Lamport: total order consistent with →. Vector clocks: detect concurrency exactly.'],
        ['State-based', 'Join-semilattice + inflationary updates; any network.'],
        ['Op-based', 'Concurrent ops commute; needs exactly-once causal delivery.'],
        ['Delta-state', 'Small lattice states joined like full states.'],
        ['Counters', 'G-Counter (per-replica max, sum), PN-Counter (P − N). No lower bound.'],
        ['Registers', 'LWW (drops concurrent writes), MV (keeps siblings).'],
        ['Sets', 'OR-Set: unique tags, remove observed tags, add wins.'],
        ['Text', 'Stable ids per character; RGA, YATA (Yjs), Fugue (Loro), Eg-walker (Diamond Types).'],
        ['Documents', 'Maps + lists + text by object id; create containers once.'],
        ['Local-first', 'Local store is truth; relay server stores, forwards, authorizes; presence is ephemeral.'],
        ['Limits', 'Only I-confluent invariants are coordination-free; use escrow or a server for the rest.']
      ),
      callout(
        'rule',
        'The decision in one paragraph',
        'Use CRDTs when users must be able to write without reaching anyone and any concurrent outcome you can define is acceptable: text, notes, canvases, personal data across devices. Use a server-authoritative system when writes must be validated against shared state: money, inventory, permissions, uniqueness. Use both when your app has both kinds of data, which most do.'
      ),
      h3('Where to go next'),
      ul(
        '[crdt.tech](https://crdt.tech): papers and implementations index.',
        'Shapiro et al., "Conflict-free Replicated Data Types" (2011) and the comprehensive study (INRIA tech report 7506).',
        'Kleppmann et al., "Local-first software" (Ink & Switch, 2019).',
        'Weidner, Gentle and Kleppmann, "The Art of the Fugue" (2023); Gentle and Kleppmann, Eg-walker paper.',
        'The Yjs INTERNALS.md and Automerge binary format docs.'
      )
    ),
  ],
};
