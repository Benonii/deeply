import type { ModulePack } from '../../../convex/lib/courseSchema';
import { callout, check, code, compare, flow, h3, p, section, terms, ul } from './b';

export const m03: ModulePack = {
  id: 'state-based',
  n: 3,
  title: 'State-based CRDTs',
  kicker: 'Semilattices, joins, counters, registers and sets',
  minutes: 40,
  summary:
    'Replicas ship their whole state and merge with a join. If the states form a semilattice and updates only move upward, convergence is guaranteed by math, whatever the network does.',
  sections: [
    section(
      'lattice',
      'The one idea: merge is a join',
      p(
        'A **state-based CRDT** (also called a convergent replicated data type, CvRDT) has three parts: a set of possible states, a **merge** function, and update operations. Replicas periodically send their full state to each other and merge whatever they receive.'
      ),
      p(
        'Convergence is guaranteed when the states form a **join-semilattice**: a partial order ≤ in which any two states have a least upper bound (the "join", written ⊔). Merge is defined as that join. Joins are automatically:'
      ),
      ul(
        '**Idempotent**: x ⊔ x = x. Duplicated messages are harmless.',
        "**Commutative**: x ⊔ y = y ⊔ x. Order of arrival doesn't matter.",
        '**Associative**: (x ⊔ y) ⊔ z = x ⊔ (y ⊔ z). Merging via an intermediary gives the same result as merging directly.'
      ),
      p(
        'The final rule: every update must be **inflationary**, meaning it moves the state up the order (new ≥ old). Then any replica that has merged in the effects of the same updates sits at the same join, so all replicas converge. The network may drop, duplicate, delay and reorder messages; as long as information eventually flows, it works.'
      ),
      callout(
        'analogy',
        'Max is the simplest join',
        'Integers with ≤ form a lattice whose join is max. If replicas only ever raise a number and merge by taking the max, they agree on the highest value anyone wrote, regardless of message order or duplication. Every state-based CRDT is this trick generalized to richer structures.'
      ),
      check(
        'Which of these merge functions is a valid join for a state-based CRDT over sets?',
        ['Intersection', 'Union', 'Symmetric difference', 'Keep the larger set'],
        1,
        'Union is idempotent, commutative and associative, and adding elements only grows the set. Intersection is also a lattice operation but adds would be undone by merge. Symmetric difference is not idempotent. "Keep the larger set" is not associative and drops elements.'
      )
    ),
    section(
      'gcounter',
      'G-Counter: a counter that only grows',
      p(
        'A single integer merged with max loses concurrent increments (both replicas go from 5 to 6, max is 6, but 7 is right). The **G-Counter** fixes this by keeping **one entry per replica**. Each replica only increments its own entry. Merge takes the per-entry max. The value is the sum.'
      ),
      code(
        'ts',
        'g-counter.ts',
        `
export type GCounter = Record<string, number>; // replicaId -> count

export const increment = (c: GCounter, me: string, by = 1): GCounter => {
  if (by < 0) throw new Error('G-Counter only grows');
  return { ...c, [me]: (c[me] ?? 0) + by };
};

export const merge = (a: GCounter, b: GCounter): GCounter => {
  const out: GCounter = { ...a };
  for (const [id, n] of Object.entries(b)) out[id] = Math.max(out[id] ?? 0, n);
  return out;
};

export const value = (c: GCounter) => Object.values(c).reduce((s, n) => s + n, 0);

// Alice and Bob both start from {A:3, B:2} (value 5).
let alice: GCounter = { A: 3, B: 2 };
let bob: GCounter = { A: 3, B: 2 };
alice = increment(alice, 'A'); // {A:4, B:2}
bob = increment(bob, 'B');     // {A:3, B:3}
value(merge(alice, bob));      // {A:4, B:3} -> 7
value(merge(merge(alice, bob), bob)); // still 7: idempotent
`
      ),
      flow({
        title: 'G-Counter merge, step by step',
        nodes: [
          { id: 's', label: 'Start', sub: '{A:3, B:2} = 5', col: 0, row: 1, tone: 'plain' },
          { id: 'a', label: 'Alice +1', sub: '{A:4, B:2} = 6', col: 1, row: 0, tone: 'yellow' },
          { id: 'b', label: 'Bob +1', sub: '{A:3, B:3} = 6', col: 1, row: 2, tone: 'purple' },
          { id: 'm1', label: 'Alice merges', sub: 'max per entry', col: 3, row: 0, tone: 'yellow' },
          { id: 'm2', label: 'Bob merges', sub: 'max per entry', col: 3, row: 2, tone: 'purple' },
          { id: 'eq', label: 'Both', sub: '{A:4, B:3} = 7', col: 4, row: 1, tone: 'red' }
        ],
        edges: [
          { id: 'sa', from: 's', to: 'a' },
          { id: 'sb', from: 's', to: 'b' },
          { id: 'ab', from: 'a', to: 'm2', label: 'state' },
          { id: 'ba', from: 'b', to: 'm1', label: 'state' },
          { id: 'aa', from: 'a', to: 'm1' },
          { id: 'bb', from: 'b', to: 'm2' },
          { id: 'x1', from: 'm1', to: 'eq' },
          { id: 'x2', from: 'm2', to: 'eq' }
        ],
        steps: [
          {
            title: 'Per-replica entries',
            text: "The counter is a map {A:3, B:2}. Entry A counts increments made on Alice's replica, entry B those made on Bob's. The value is the sum, 5.",
            nodes: ['s']
          },
          {
            title: 'Concurrent increments touch different entries',
            text: 'Alice increments only her own entry (A: 3 → 4). Bob increments only his (B: 2 → 3). Because no two replicas write the same entry, there is nothing to conflict on.',
            nodes: ['a', 'b'],
            edges: ['sa', 'sb']
          },
          {
            title: 'Ship the whole state',
            text: 'Each replica sends its full map. The messages can arrive in any order, be duplicated, or travel through a third replica first.',
            edges: ['ab', 'ba']
          },
          {
            title: 'Merge with per-entry max',
            text: 'max(4, 3) = 4 for A, max(2, 3) = 3 for B. Max is the join for each entry, so the merge of maps is the join of the product lattice.',
            nodes: ['m1', 'm2'],
            edges: ['aa', 'bb']
          },
          {
            title: 'Converged and correct',
            text: "Both hold {A:4, B:3} with value 7, which counts both increments. Merging Bob's old state again changes nothing.",
            nodes: ['eq'],
            edges: ['x1', 'x2']
          }
        ]
      }),
      callout(
        'rule',
        'Give each writer its own slot',
        'Most state-based CRDTs avoid conflicts the same way: partition the state so that each replica only writes data it owns, then define merge entry by entry. Conflicts only exist where two replicas write the same slot.'
      )
    ),
    section(
      'pncounter',
      'PN-Counter: allowing decrements',
      p(
        'Decrementing an entry would move the state *down* the lattice, and max-merge would undo it. The **PN-Counter** uses two G-Counters: P for increments and N for decrements. Value = sum(P) − sum(N). Both halves only grow, so merge stays a join.'
      ),
      code(
        'ts',
        'pn-counter.ts',
        `
import * as G from './g-counter';

export type PNCounter = { p: G.GCounter; n: G.GCounter };

export const inc = (c: PNCounter, me: string, by = 1): PNCounter => ({ ...c, p: G.increment(c.p, me, by) });
export const dec = (c: PNCounter, me: string, by = 1): PNCounter => ({ ...c, n: G.increment(c.n, me, by) });
export const merge = (a: PNCounter, b: PNCounter): PNCounter => ({ p: G.merge(a.p, b.p), n: G.merge(a.n, b.n) });
export const value = (c: PNCounter) => G.value(c.p) - G.value(c.n);
`
      ),
      callout(
        'warn',
        'A PN-Counter cannot stay non-negative',
        "Stock = 1. Two offline replicas each sell the last item: each decrements, each sees 0, both orders succeed. After merge the stock is −1. No merge rule can prevent this, because neither replica knew about the other's sale. Keeping a counter above zero needs coordination, or a design like escrow (module 8)."
      )
    ),
    section(
      'sets',
      'Sets: G-Set and 2P-Set',
      p(
        'A **G-Set** (grow-only set) supports add and merges by union. It is the simplest useful CRDT and is often the building block for others (an append-only log of events is a G-Set of uniquely identified events).'
      ),
      p(
        'A **2P-Set** (two-phase set) adds removal with a second G-Set of **tombstones**: removed elements. An element is present if it is in the add-set and not the remove-set. The catch: once removed, an element can never be re-added, because the tombstone is permanent. That suits ids that are never reused, and almost nothing else.'
      ),
      compare(
        'Set CRDTs',
        ['Type', 'Operations', 'Concurrent add + remove of x', 'Re-add after remove'],
        ['G-Set', 'add', 'n/a', 'n/a'],
        ['2P-Set', 'add, remove', 'Removed (remove wins forever)', 'Impossible'],
        [
          'LWW-Element-Set',
          'add, remove with timestamps',
          'Whichever has the later timestamp',
          'Yes, with a later timestamp'
        ],
        ['OR-Set (add-wins)', 'add, remove', 'Present (add wins)', 'Yes'],
        ['Remove-wins set', 'add, remove', 'Absent', 'Yes']
      )
    ),
    section(
      'registers',
      'Registers: LWW and multi-value',
      p(
        'A **register** holds a single value. The **LWW-Register** stores (value, timestamp) and merge keeps the pair with the larger timestamp, using the replica id to break ties so that the order is total. It is a join over (timestamp, replicaId) ordered lexicographically.'
      ),
      code(
        'ts',
        'lww-register.ts',
        `
export type LWW<T> = { value: T; time: number; replica: string };

export const set = <T>(r: LWW<T>, value: T, time: number, replica: string): LWW<T> => {
  // Callers must pass a time greater than r.time (e.g. a Lamport or HLC tick).
  return { value, time, replica };
};

export const merge = <T>(a: LWW<T>, b: LWW<T>): LWW<T> =>
  a.time > b.time || (a.time === b.time && a.replica > b.replica) ? a : b;
`
      ),
      p(
        'The **MV-Register** (multi-value register, used in Dynamo and Riak) keeps *every* concurrently written value. Each value carries a version vector. On merge, drop any value whose vector is dominated by another; keep the rest. Reading may return several values ("siblings"), and the next write, made with knowledge of all of them, replaces them.'
      ),
      code(
        'ts',
        'mv-register.ts',
        `
import { compare, merge as mergeVV, tick, type VClock } from './vector-clock';

export type MVReg<T> = { entries: { value: T; vv: VClock }[] };

export function write<T>(r: MVReg<T>, value: T, me: string): MVReg<T> {
  // The new write has seen every current sibling.
  const seen = r.entries.reduce<VClock>((acc, e) => mergeVV(acc, e.vv), {});
  return { entries: [{ value, vv: tick(seen, me) }] };
}

export function merge<T>(a: MVReg<T>, b: MVReg<T>): MVReg<T> {
  const all = [...a.entries, ...b.entries];
  const kept = all.filter(
    (e, i) => !all.some((o, j) => j !== i && compare(e.vv, o.vv) === 'before'),
  );
  // Remove exact duplicates (the same write seen via both sides).
  const uniq = kept.filter((e, i) => kept.findIndex((o) => compare(o.vv, e.vv) === 'equal') === i);
  return { entries: uniq };
}

export const read = <T>(r: MVReg<T>) => r.entries.map((e) => e.value);
`
      ),
      check(
        'Alice sets title = "Plan" and Bob concurrently sets title = "Roadmap". After merge, what does an MV-Register return?',
        [
          '"Plan" or "Roadmap", whichever has the later timestamp',
          'Both values',
          'Neither; the register is cleared',
          'An error'
        ],
        1,
        'Neither write dominates the other, so both are kept as siblings. The application (or user) chooses, and that choice becomes a new write that supersedes both.'
      )
    ),
    section(
      'orset',
      'OR-Set: the set people actually want',
      p(
        'The **observed-remove set** (OR-Set, also called add-wins set) lets elements be added and removed any number of times, and resolves a concurrent add and remove of the same element in favor of the add. The trick: each add creates a unique **tag** (a dot). A remove deletes only the tags the remover has **observed**. A concurrent add has a tag the remover never saw, so it survives.'
      ),
      code(
        'ts',
        'or-set.ts',
        `
type Tag = string; // unique per add, e.g. \`\${replica}:\${counter}\`

export type ORSet<T> = {
  adds: Map<T, Set<Tag>>; // live tags per element
  removed: Set<Tag>;      // tombstones (the naive version keeps them forever)
};

export const empty = <T>(): ORSet<T> => ({ adds: new Map(), removed: new Set() });

export function add<T>(s: ORSet<T>, x: T, tag: Tag): ORSet<T> {
  const adds = new Map(s.adds);
  adds.set(x, new Set([...(adds.get(x) ?? []), tag]));
  return { adds, removed: s.removed };
}

/** Removes only the tags this replica has observed for x. */
export function remove<T>(s: ORSet<T>, x: T): ORSet<T> {
  const removed = new Set(s.removed);
  for (const t of s.adds.get(x) ?? []) removed.add(t);
  return { adds: s.adds, removed };
}

export function merge<T>(a: ORSet<T>, b: ORSet<T>): ORSet<T> {
  const adds = new Map(a.adds);
  for (const [x, tags] of b.adds) adds.set(x, new Set([...(adds.get(x) ?? []), ...tags]));
  return { adds, removed: new Set([...a.removed, ...b.removed]) };
}

export const has = <T>(s: ORSet<T>, x: T) => [...(s.adds.get(x) ?? [])].some((t) => !s.removed.has(t));
`,
        'Tags here are strings like "A:7". The template literal in the comment is only an example format. Production OR-Sets drop tombstones by using a version vector as the causal context: a tag is removed if the context covers it but it is no longer in the add map (the "optimized OR-Set" of Bieniusa et al. 2012).'
      ),
      flow({
        title: 'Concurrent add and remove in an OR-Set',
        nodes: [
          { id: 's', label: 'Both replicas', sub: 'milk: {A:1}', col: 0, row: 1, tone: 'plain' },
          { id: 'al', label: 'Alice: remove', sub: 'tombstone A:1', col: 1, row: 0, tone: 'yellow' },
          { id: 'bo', label: 'Bob: add milk', sub: 'new tag B:4', col: 1, row: 2, tone: 'purple' },
          { id: 'ma', label: 'Alice merges', sub: 'tags {A:1, B:4}', col: 3, row: 0, tone: 'yellow' },
          { id: 'mb', label: 'Bob merges', sub: 'removed {A:1}', col: 3, row: 2, tone: 'purple' },
          { id: 'r', label: 'Result', sub: 'milk present via B:4', col: 4, row: 1, tone: 'red' }
        ],
        edges: [
          { id: 'sa', from: 's', to: 'al' },
          { id: 'sb', from: 's', to: 'bo' },
          { id: 'ab', from: 'al', to: 'mb', label: 'state' },
          { id: 'ba', from: 'bo', to: 'ma', label: 'state' },
          { id: 'ar', from: 'ma', to: 'r' },
          { id: 'br', from: 'mb', to: 'r' }
        ],
        steps: [
          {
            title: 'Elements carry tags',
            text: 'Milk was added once by Alice, creating tag A:1. Both replicas know milk ↦ {A:1}.',
            nodes: ['s']
          },
          {
            title: 'Alice removes milk',
            text: 'Alice removes the tags she has observed: she tombstones A:1. Locally milk is gone.',
            nodes: ['al'],
            edges: ['sa']
          },
          {
            title: 'Bob concurrently adds milk',
            text: 'Bob, not having seen the remove, adds milk again. That creates a fresh tag B:4, so milk ↦ {A:1, B:4} on his side.',
            nodes: ['bo'],
            edges: ['sb']
          },
          {
            title: 'Merge unions tags and tombstones',
            text: 'After exchanging states, both replicas hold tags {A:1, B:4} and tombstones {A:1}.',
            nodes: ['ma', 'mb'],
            edges: ['ab', 'ba']
          },
          {
            title: 'Add wins',
            text: "Tag B:4 is not tombstoned, so milk is present. Alice's remove only ever applied to the add she saw. That matches intuition: Bob wanted milk on the list after Alice's removal, from his point of view.",
            nodes: ['r'],
            edges: ['ar', 'br']
          },
          {
            title: 'Alternative policies',
            text: 'A remove-wins set would make milk absent. Neither is "correct" in general: add-wins fits shopping lists and tags; remove-wins fits "kick user from room". Pick per use case.',
            nodes: ['r']
          }
        ]
      }),
      check(
        'In an add-wins OR-Set, Alice removes "x" after observing tags {A:1, A:3}. Concurrently Bob, who had only seen A:1, also removes "x". No one adds. After merge, is "x" present?',
        [
          'Yes, because A:3 was not removed by Bob',
          'No, all observed tags were removed by someone',
          'Yes, adds always win',
          'It depends on timestamps'
        ],
        1,
        "Tombstones union: Alice removed A:1 and A:3, Bob removed A:1. Every tag is tombstoned, so x is absent. Add-wins only matters when there is an add the removers didn't observe."
      )
    ),
    section(
      'delta',
      'Delta-state CRDTs: ship only what changed',
      p(
        'Shipping the entire state on every sync is wasteful: a G-Counter with 10,000 replicas sends 10,000 entries to report one increment. **Delta-state CRDTs** (Almeida, Shoker and Baquero, 2015–2018) make each update return a small **delta**, itself a state in the same lattice (for a G-Counter, just {A:4}). Replicas join deltas into their state exactly like full states.'
      ),
      p(
        'Because deltas are lattice states, all the nice properties carry over: deltas can be batched by joining them, duplicated, or reordered. The protocol only needs to make sure each replica eventually receives a set of deltas whose join covers what it is missing, typically by tracking acknowledgements and falling back to full state when a peer falls far behind.'
      ),
      callout(
        'deep',
        'Deltas and causal delivery',
        'Some delta CRDTs (like OR-Sets with causal contexts) require deltas to be applied in causal order or as "delta intervals" to be correct. The papers call these causal delta-mutators. This is the same constraint op-based CRDTs face, which is why the two families end up looking alike in production.'
      ),
      check(
        'Why is it safe to join two pending deltas into one before sending?',
        [
          'Deltas are operations that commute',
          'Deltas are lattice states, and join is associative and idempotent',
          'The receiver deduplicates by message id',
          'It is only safe over TCP'
        ],
        1,
        'A delta is just a (small) state. Joining d1 ⊔ d2 and sending once has the same effect as sending both, by associativity; resending is harmless by idempotence.'
      )
    ),
    section(
      'recap',
      'Recap',
      terms(
        ['Join-semilattice', 'Partial order where every pair has a least upper bound (join).'],
        ['Inflationary update', 'An update that never moves the state down the order.'],
        ['G-Counter', 'Per-replica counts; merge = max per entry; value = sum.'],
        ['PN-Counter', 'Two G-Counters; value = P − N. Cannot enforce a lower bound.'],
        ['LWW-Register', 'Keep the value with the highest (timestamp, replica). Drops concurrent writes.'],
        ['MV-Register', 'Keep all concurrent values (siblings) using version vectors.'],
        ['OR-Set', 'Add-wins set using unique tags per add; remove deletes observed tags.'],
        ['Delta-state CRDT', 'Updates produce small lattice states (deltas) that are joined like full states.']
      ),
      h3('Next'),
      p(
        'State-based CRDTs tolerate any network but can be heavy. Module 4 flips the approach: send small operations, and make the delivery layer do more work.'
      )
    )
  ]
};
