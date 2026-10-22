import type { ModulePack } from '../../../convex/lib/courseSchema';
import { callout, check, code, compare, flow, h3, ol, p, section, terms, ul } from './b';

export const m02: ModulePack = {
  id: 'time-causality',
  n: 2,
  title: 'Time & causality',
  kicker: 'Lamport clocks, vector clocks, version vectors, HLCs',
  minutes: 35,
  summary:
    'Wall clocks cannot tell you which update came first. Logical clocks can: they capture "happened before" exactly, and let a replica tell a later update apart from a concurrent one.',
  sections: [
    section(
      'wall-clocks',
      'Why wall clocks lie',
      p(
        'The tempting way to order updates is to stamp each with `Date.now()` and keep the newest. It fails in three ways:'
      ),
      ul(
        "**Skew**: two machines' clocks disagree. NTP typically keeps them within a few milliseconds on a good network, but phones and laptops can be off by seconds or minutes, and a user can set their clock to anything.",
        '**Jumps**: NTP corrections and leap-second smearing can move a clock backwards, so a later event on the same machine can get an earlier timestamp.',
        '**No notion of concurrency**: even perfect clocks only give a total order. They cannot tell "B saw A and then wrote" apart from "A and B wrote at nearly the same moment without seeing each other". Those two cases need different merges.'
      ),
      callout(
        'warn',
        'A clock skew bug in one line',
        "Bob's phone is 3 minutes slow. He fixes a typo Alice made a minute earlier. With timestamp LWW, Alice's older version wins because her clock reads later, and Bob's fix vanishes. Nothing errors; the data is just wrong."
      )
    ),
    section(
      'happens-before',
      'Happens-before',
      p(
        'Leslie Lamport\'s 1978 paper "Time, Clocks, and the Ordering of Events in a Distributed System" defines causality without clocks. Event *a* **happens before** event *b* (written a → b) if:'
      ),
      ol(
        '*a* and *b* are on the same process and *a* comes first, or',
        '*a* is sending a message and *b* is receiving that message, or',
        'there is some *c* with a → c and c → b (transitivity).'
      ),
      p(
        'If neither a → b nor b → a, the events are **concurrent** (a ∥ b). Concurrent does not mean "at the same time"; it means neither could have known about the other. Two edits made a week apart on disconnected laptops are concurrent.'
      ),
      callout(
        'insight',
        'Causality is the information CRDTs need',
        'If an update b happened after a, b was made with knowledge of a, so b should win or build on a. If they are concurrent, neither knew about the other, and the data type must combine them by a rule. Every CRDT design is a way of tracking, or making unnecessary, the distinction between "after" and "concurrent".'
      ),
      check(
        'Alice writes x=1 at 09:00 on her laptop, offline. Bob writes x=2 at 17:00 on his phone, also offline and without ever having synced with Alice. How are these writes related?',
        [
          "Alice's write happened before Bob's",
          "Bob's write happened before Alice's",
          'They are concurrent',
          'It depends on clock skew'
        ],
        2,
        'No message path connects them, so neither happened before the other. Eight hours of wall-clock difference is irrelevant to causality.'
      )
    ),
    section(
      'lamport',
      'Lamport clocks',
      p(
        'A **Lamport clock** is one integer per process. Rules: increment before each local event; attach the value to every message; on receive, set the clock to `max(local, received) + 1`.'
      ),
      code(
        'ts',
        'lamport.ts',
        `
export class LamportClock {
  private time = 0;

  /** Call for a local event or before sending. Returns the event's timestamp. */
  tick(): number {
    this.time += 1;
    return this.time;
  }

  /** Call when a message stamped with \`remote\` arrives. */
  receive(remote: number): number {
    this.time = Math.max(this.time, remote) + 1;
    return this.time;
  }
}

// Total order for ties: compare (time, replicaId).
export type Stamp = { time: number; replica: string };
export const compareStamps = (a: Stamp, b: Stamp) =>
  a.time - b.time || (a.replica < b.replica ? -1 : a.replica > b.replica ? 1 : 0);
`
      ),
      p(
        'The guarantee goes one way: if a → b then L(a) < L(b). The converse is false: L(a) < L(b) does not mean a → b. A Lamport timestamp cannot detect concurrency. What it gives you is a cheap total order consistent with causality, which is exactly what LWW registers and many sequence CRDTs (RGA, YATA) use to break ties deterministically.'
      ),
      flow({
        title: 'Lamport timestamps across three replicas',
        nodes: [
          { id: 'a1', label: 'A: write', sub: 'L = 1', col: 0, row: 0, tone: 'yellow' },
          { id: 'a2', label: 'A: send', sub: 'L = 2', col: 1, row: 0, tone: 'yellow' },
          { id: 'b1', label: 'B: write', sub: 'L = 1', col: 0, row: 1, tone: 'purple' },
          { id: 'b2', label: 'B: receive', sub: 'max(1,2)+1 = 3', col: 2, row: 1, tone: 'purple' },
          { id: 'b3', label: 'B: send', sub: 'L = 4', col: 3, row: 1, tone: 'purple' },
          { id: 'c1', label: 'C: write', sub: 'L = 1', col: 2, row: 2, tone: 'red' },
          { id: 'c2', label: 'C: receive', sub: 'max(1,4)+1 = 5', col: 4, row: 2, tone: 'red' }
        ],
        edges: [
          { id: 'ab', from: 'a2', to: 'b2', label: 'msg L=2' },
          { id: 'bc', from: 'b3', to: 'c2', label: 'msg L=4' },
          { id: 'aa', from: 'a1', to: 'a2' },
          { id: 'bb', from: 'b1', to: 'b2' },
          { id: 'bb2', from: 'b2', to: 'b3' },
          { id: 'cc', from: 'c1', to: 'c2' }
        ],
        steps: [
          {
            title: 'Local events tick',
            text: 'Each replica starts at 0 and increments before every event. A, B and C each make a first write stamped 1. Equal numbers say nothing about order between replicas.',
            nodes: ['a1', 'b1', 'c1']
          },
          {
            title: 'Send carries the clock',
            text: 'A ticks to 2 and sends a message stamped 2 to B.',
            nodes: ['a2'],
            edges: ['aa', 'ab']
          },
          {
            title: 'Receive jumps forward',
            text: "B's clock is 1. On receiving 2 it sets max(1, 2) + 1 = 3. Now anything B does next is stamped higher than A's send, preserving a → b ⇒ L(a) < L(b).",
            nodes: ['b2'],
            edges: ['bb', 'ab']
          },
          {
            title: 'Causality propagates transitively',
            text: "B sends at 4. C, at 1, receives and jumps to 5. A's write (1) → A's send (2) → B's receive (3) → B's send (4) → C's receive (5): every step increases.",
            nodes: ['b3', 'c2'],
            edges: ['bb2', 'bc', 'cc']
          },
          {
            title: 'The blind spot',
            text: "C's first write (L=1) and A's send (L=2) are concurrent, yet 1 < 2. Looking only at the numbers you would wrongly conclude C's write came first. Lamport clocks order; they do not detect concurrency.",
            nodes: ['c1', 'a2']
          }
        ]
      })
    ),
    section(
      'vector',
      'Vector clocks',
      p(
        'A **vector clock** keeps one counter per replica: a map from replica id to the number of events seen from that replica. Rules: on a local event increment your own entry; send the whole vector; on receive take the entry-wise max, then increment your own entry.'
      ),
      p(
        'Comparison is entry-wise. V ≤ W if every entry of V is ≤ the matching entry of W. Then a → b exactly when V(a) ≤ V(b) and V(a) ≠ V(b). If neither V ≤ W nor W ≤ V, the events are concurrent. Unlike Lamport clocks, vector clocks characterize causality **exactly**.'
      ),
      code(
        'ts',
        'vector-clock.ts',
        `
export type VClock = Record<string, number>;

export function tick(v: VClock, me: string): VClock {
  return { ...v, [me]: (v[me] ?? 0) + 1 };
}

export function merge(a: VClock, b: VClock): VClock {
  const out: VClock = { ...a };
  for (const [k, n] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, n);
  return out;
}

export type Order = 'before' | 'after' | 'equal' | 'concurrent';

export function compare(a: VClock, b: VClock): Order {
  let aLess = false;
  let bLess = false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? 0;
    const y = b[k] ?? 0;
    if (x < y) aLess = true;
    if (y < x) bLess = true;
  }
  if (aLess && bLess) return 'concurrent';
  if (aLess) return 'before';
  if (bLess) return 'after';
  return 'equal';
}

// Example from the diagram below:
compare({ A: 2 }, { A: 2, B: 2 });       // 'before'
compare({ A: 1, C: 2 }, { A: 2, B: 2 }); // 'concurrent'
`
      ),
      flow({
        title: 'Detecting concurrency with vector clocks',
        nodes: [
          { id: 'a1', label: 'A: edit', sub: '{A:1}', col: 0, row: 0, tone: 'yellow' },
          { id: 'a2', label: 'A: edit', sub: '{A:2}', col: 1, row: 0, tone: 'yellow' },
          { id: 'b1', label: 'B: receive', sub: '{A:2, B:1}', col: 2, row: 1, tone: 'purple' },
          { id: 'b2', label: 'B: edit', sub: '{A:2, B:2}', col: 3, row: 1, tone: 'purple' },
          { id: 'c0', label: 'C: edit', sub: '{A:1, C:2}', col: 1, row: 2, tone: 'red' },
          { id: 'cmp', label: 'Compare', sub: 'C edit vs B edit', col: 4, row: 2, tone: 'plain' }
        ],
        edges: [
          { id: 'aa', from: 'a1', to: 'a2' },
          { id: 'ab', from: 'a2', to: 'b1', label: 'sync' },
          { id: 'ac', from: 'a1', to: 'c0', label: 'sync' },
          { id: 'bb', from: 'b1', to: 'b2' },
          { id: 'bx', from: 'b2', to: 'cmp' },
          { id: 'cx', from: 'c0', to: 'cmp' }
        ],
        steps: [
          {
            title: 'A makes two edits',
            text: 'A increments its own entry for each edit: {A:1}, then {A:2}.',
            nodes: ['a1', 'a2'],
            edges: ['aa']
          },
          {
            title: 'C learns of the first edit only',
            text: 'C syncs early and receives {A:1}. Merging and ticking for the receive gives {A:1, C:1}; C then edits, ticking again: {A:1, C:2}.',
            nodes: ['c0'],
            edges: ['ac']
          },
          {
            title: 'B learns of both edits',
            text: 'B receives {A:2}. Merge gives {A:2}; B ticks for the receive event: {A:2, B:1}. Then B edits: {A:2, B:2}.',
            nodes: ['b1', 'b2'],
            edges: ['ab', 'bb']
          },
          {
            title: "Compare B's edit with A's",
            text: "{A:2} ≤ {A:2, B:2} entry by entry and they differ, so A's second edit happened before B's edit. B's edit may safely override it.",
            nodes: ['a2', 'b2']
          },
          {
            title: "Compare C's edit with B's",
            text: 'C has A=1 < 2 and B=0 < 2, but C=2 > 0. Neither vector dominates: the edits are concurrent. A register must now keep both values or apply a tie rule.',
            nodes: ['cmp', 'c0', 'b2'],
            edges: ['bx', 'cx']
          },
          {
            title: 'The cost',
            text: 'A vector has one entry per replica that ever wrote. With thousands of devices, metadata grows. Real systems compress, prune retired replicas, or switch to techniques that avoid full vectors per value.',
            nodes: ['cmp']
          }
        ]
      }),
      check(
        'Event X has vector {A:3, B:1}. Event Y has vector {A:2, B:4}. What is their relationship?',
        ['X happened before Y', 'Y happened before X', 'Concurrent', 'Equal'],
        2,
        'X has more of A (3 > 2), Y has more of B (4 > 1). Neither dominates, so they are concurrent.'
      )
    ),
    section(
      'version-vectors',
      'Version vectors and dotted version vectors',
      p(
        'A **version vector** looks like a vector clock but tracks a different thing: which *updates to a data item* a replica has incorporated, not every event in the system. It is incremented only on writes, not on sends and receives. Version vectors are what Dynamo-style stores attach to each value to detect conflicting versions, and what sync protocols exchange to ask "what are you missing?".'
      ),
      p(
        'Version vectors have a subtle failure when many clients write through a few servers. If the vector is keyed by server, two clients writing through the same server with stale reads get vectors that wrongly look causally ordered, and an update can be lost. If it is keyed by client, the vector grows without bound. Riak hit this as **sibling explosion**: values accumulating many false siblings.'
      ),
      p(
        '**Dotted version vectors** (Preguiça, Baquero, Almeida and others, 2010–2012; adopted in Riak 2.0) fix it by tagging each stored value with a single **dot**, the (server, counter) pair of the write that created it, alongside the causal context the writer had seen. A new write removes exactly the siblings whose dots its context covers and keeps the rest. Siblings are then concurrent by construction, never by accident.'
      ),
      callout(
        'deep',
        'Dots are everywhere',
        'The idea of naming each write by a unique dot (replica, counter) and tracking a causal context as "all dots I have seen" reappears in the optimized OR-Set (module 3), delta-state CRDTs, and in Yjs, where every item\'s id is (clientID, clock) and a state vector is the compressed causal context.'
      ),
      compare(
        'Causality tools',
        ['Tool', 'Size', 'Detects concurrency?', 'Used for'],
        ['Lamport clock', '1 integer', 'No', 'Total order for tie-breaking (LWW, RGA, YATA)'],
        ['Vector clock', 'One entry per process', 'Yes, for events', 'Causal broadcast, debugging, causal delivery'],
        [
          'Version vector',
          'One entry per writing replica',
          'Yes, for versions of data',
          'Dynamo-style stores, sync "what am I missing"'
        ],
        [
          'Dotted version vector',
          'Vector + one dot per sibling',
          'Yes, without false siblings',
          'Riak 2.0+, causal-context CRDTs'
        ],
        [
          'Hybrid logical clock',
          '64 bits (physical + logical)',
          'No (like Lamport)',
          'Human-meaningful, causally consistent timestamps'
        ]
      )
    ),
    section(
      'hlc',
      'Hybrid logical clocks',
      p(
        'A **hybrid logical clock** (Kulkarni, Demirbas and others, 2014) keeps a pair (l, c): *l* tracks the largest physical time seen, *c* is a logical counter for events that share the same *l*. HLC timestamps stay within the clock skew bound of real time, so they are readable and sortable like wall-clock times, yet they never go backwards and they respect causality like Lamport clocks.'
      ),
      code(
        'ts',
        'hlc.ts',
        `
export type HLC = { l: number; c: number };

export function send(local: HLC, now: number): HLC {
  const l = Math.max(local.l, now);
  return { l, c: l === local.l ? local.c + 1 : 0 };
}

export function receive(local: HLC, msg: HLC, now: number): HLC {
  const l = Math.max(local.l, msg.l, now);
  let c: number;
  if (l === local.l && l === msg.l) c = Math.max(local.c, msg.c) + 1;
  else if (l === local.l) c = local.c + 1;
  else if (l === msg.l) c = msg.c + 1;
  else c = 0;
  return { l, c };
}

export const compareHLC = (a: HLC, b: HLC) => a.l - b.l || a.c - b.c;

// A replica whose clock runs slow still produces later stamps after receiving:
let mine: HLC = { l: 1000, c: 0 };
mine = receive(mine, { l: 5000, c: 3 }, /* now */ 1200); // { l: 5000, c: 4 }
`
      ),
      p(
        'HLCs are used by CockroachDB and MongoDB for transaction timestamps, and by local-first systems that want LWW with timestamps humans can read. They still only give a total order, so they replace Lamport clocks, not vector clocks.'
      ),
      check(
        'Why do some CRDT libraries use HLCs instead of plain Lamport clocks for LWW fields?',
        [
          'HLCs detect concurrent writes',
          'HLC timestamps stay close to real time, so "last" roughly matches what users saw, while still respecting causality',
          'HLCs need no per-replica state',
          'HLCs remove the need for replica ids in tie-breaks'
        ],
        1,
        'An HLC behaves like a Lamport clock (causal, monotonic) but tracks physical time, so a value edited "later" in the real world usually wins. Ties still need a replica id, and concurrency still isn\'t detected.'
      )
    ),
    section(
      'recap',
      'Recap',
      terms(
        ['a → b', 'Happens-before: a could have influenced b (same process order, or a message path).'],
        ['a ∥ b', 'Concurrent: neither happened before the other.'],
        ['Lamport clock', 'Integer clock with a → b ⇒ L(a) < L(b). Gives a total order, cannot detect concurrency.'],
        ['Vector clock', 'Per-process counters compared entry-wise; exactly characterizes happens-before.'],
        ['Dot', 'A unique write identifier (replica, counter).'],
        ['Causal context', 'The set of dots a replica has seen, often compressed into a version vector.'],
        ['HLC', 'Lamport clock that tracks physical time; causal and human-readable.']
      ),
      check(
        'A sequence CRDT needs to order two concurrent inserts at the same position identically on every replica. What is the minimum it needs?',
        [
          'A vector clock per insert',
          'A deterministic tiebreak such as (Lamport time, replica id)',
          'Synchronized wall clocks',
          'A central server'
        ],
        1,
        'Concurrent inserts just need *some* order that every replica computes the same way. A Lamport timestamp plus replica id is unique and deterministic, which is what RGA and YATA use.'
      ),
      h3('Next'),
      p(
        'With causality in hand, module 3 builds the first family of CRDTs: state-based types whose merge is a mathematical join.'
      )
    )
  ]
};
