import type { ModulePack } from '../../../convex/lib/courseSchema';
import { callout, check, code, compare, flow, h3, p, section, terms, ul } from './b';

export const m04: ModulePack = {
  id: 'op-based',
  n: 4,
  title: 'Operation-based CRDTs',
  kicker: 'Commuting operations over causal broadcast',
  minutes: 30,
  summary:
    'Instead of shipping state, replicas broadcast the operations they performed. Messages get small, but the network layer must now deliver every operation exactly once and in causal order.',
  sections: [
    section(
      'idea',
      'Ship the operation, not the state',
      p('An **operation-based CRDT** (commutative replicated data type, CmRDT) splits each update into two phases:'),
      ul(
        '**Prepare** (also called generator or source): runs only on the replica where the user acted. It reads local state and produces an operation message, capturing whatever context is needed (for example the tags being removed).',
        '**Effect** (downstream): runs on every replica, including the origin, when the operation is delivered. It mutates local state.'
      ),
      p(
        "Convergence requires that **effects of concurrent operations commute**: applying op1 then op2 gives the same state as op2 then op1. Operations that are causally ordered don't need to commute, because the delivery layer guarantees they are applied in order everywhere."
      ),
      callout(
        'insight',
        'The contract moved',
        'State-based CRDTs demand a lot from the data type (a lattice) and almost nothing from the network. Op-based CRDTs demand less from the data type (only concurrent ops must commute) and more from the network: **reliable causal broadcast**, meaning every op is delivered to every replica exactly once, and never before an op it causally depends on.'
      )
    ),
    section(
      'counter',
      'An op-based counter',
      p(
        'The op-based counter is tiny: the operation is "add n", and addition commutes. No per-replica map is needed, because the delivery layer guarantees each increment is applied exactly once.'
      ),
      code(
        'ts',
        'op-counter.ts',
        `
export type CounterOp = { id: string; delta: number }; // id lets the transport dedupe

export class OpCounter {
  value = 0;
  private applied = new Set<string>();

  /** Prepare phase: runs only at the origin. */
  prepare(delta: number, id: string): CounterOp {
    return { id, delta };
  }

  /** Effect phase: runs everywhere, including the origin. */
  apply(op: CounterOp) {
    if (this.applied.has(op.id)) return; // exactly-once, enforced here for safety
    this.applied.add(op.id);
    this.value += op.delta;
  }
}
`,
        'Without the dedupe set, a retransmitted op would be counted twice. Real systems keep dedupe cheap with version vectors: "I have applied every op from replica A up to counter 41".'
      ),
      check(
        'A network library guarantees at-least-once delivery but no ordering. Which of these is safe to use directly as an op-based CRDT on it?',
        [
          'A counter whose op is "add n"',
          'An OR-Set whose remove op lists observed tags',
          'Neither without extra machinery',
          'Both'
        ],
        2,
        'At-least-once means duplicates, so "add n" double-counts without deduplication. The OR-Set remove also needs causal order: a remove arriving before the add it observed would find nothing to remove, and the later add would resurrect the element.'
      )
    ),
    section(
      'causal-broadcast',
      'Causal broadcast',
      p(
        'Causal broadcast delivers a message only after every message that causally precedes it. A standard implementation attaches a vector clock to every op. A receiver buffers an op from replica j with vector V until it has delivered exactly V[j] − 1 earlier ops from j, and at least V[k] ops from every other replica k.'
      ),
      code(
        'ts',
        'causal-broadcast.ts',
        `
import type { VClock } from './vector-clock';

export type Msg<Op> = { from: string; vv: VClock; op: Op };

export class CausalDelivery<Op> {
  private delivered: VClock = {};
  private buffer: Msg<Op>[] = [];

  constructor(private onDeliver: (op: Op) => void) {}

  receive(m: Msg<Op>) {
    if ((this.delivered[m.from] ?? 0) >= m.vv[m.from]) return; // duplicate
    this.buffer.push(m);
    this.drain();
  }

  private ready(m: Msg<Op>) {
    for (const [k, n] of Object.entries(m.vv)) {
      const have = this.delivered[k] ?? 0;
      if (k === m.from ? n !== have + 1 : n > have) return false;
    }
    return true;
  }

  private drain() {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const m of this.buffer) {
        if (!this.ready(m)) continue;
        this.onDeliver(m.op);
        this.delivered[m.from] = m.vv[m.from];
        this.buffer = this.buffer.filter((x) => x !== m);
        progressed = true;
        break;
      }
    }
  }
}
`
      ),
      flow({
        title: 'A remove arrives before the add it depends on',
        nodes: [
          { id: 'a', label: 'Alice: add x', sub: 'vv {A:1}', col: 0, row: 0, tone: 'yellow' },
          { id: 'b', label: 'Bob: remove x', sub: 'vv {A:1, B:1}', col: 1, row: 1, tone: 'purple' },
          { id: 'c', label: 'Carol receives', sub: 'remove first', col: 2, row: 2, tone: 'red' },
          { id: 'buf', label: 'Buffer', sub: 'needs A:1', col: 3, row: 2, tone: 'plain' },
          { id: 'add', label: 'Add arrives', sub: 'deliver A:1', col: 3, row: 0, tone: 'yellow' },
          { id: 'ok', label: 'Deliver remove', sub: 'x absent', col: 4, row: 1, tone: 'red' }
        ],
        edges: [
          { id: 'ab', from: 'a', to: 'b', label: 'Bob sees add' },
          { id: 'bc', from: 'b', to: 'c', label: 'fast path' },
          { id: 'cb', from: 'c', to: 'buf' },
          { id: 'ac', from: 'a', to: 'add', label: 'slow path' },
          { id: 'ao', from: 'add', to: 'ok' },
          { id: 'bo', from: 'buf', to: 'ok' }
        ],
        steps: [
          { title: 'Alice adds x', text: "Alice's op has vector {A:1}: it is her first op.", nodes: ['a'] },
          {
            title: 'Bob removes x after seeing the add',
            text: "Bob delivered Alice's add, then removed x. His op carries {A:1, B:1}, which records that it depends on A's first op.",
            nodes: ['b'],
            edges: ['ab']
          },
          {
            title: 'Carol gets the remove first',
            text: "The network delivers Bob's op to Carol before Alice's. Carol has delivered nothing from A, but the op needs A:1.",
            nodes: ['c'],
            edges: ['bc']
          },
          {
            title: 'Buffer instead of applying',
            text: 'Applying now would remove nothing; then the add would arrive and x would appear, contradicting what Bob saw. Causal delivery holds the op in a buffer.',
            nodes: ['buf'],
            edges: ['cb']
          },
          {
            title: 'The dependency arrives',
            text: "Alice's add reaches Carol and is delivered. delivered = {A:1}.",
            nodes: ['add'],
            edges: ['ac']
          },
          {
            title: 'Unblock and deliver',
            text: "Bob's op is now ready (A:1 ≤ delivered, and it is B's next op). Carol removes x, matching Alice and Bob.",
            nodes: ['ok'],
            edges: ['ao', 'bo']
          }
        ]
      }),
      check(
        'Carol has delivered {A:2, B:0}. A message from B arrives with vector {A:3, B:1}. What does causal delivery do?',
        [
          'Deliver it now',
          "Buffer it until A's third op is delivered",
          'Drop it as a duplicate',
          "Deliver it and request A's op afterwards"
        ],
        1,
        "B's op depends on three ops from A, but Carol has only delivered two. It waits in the buffer."
      )
    ),
    section(
      'orset-op',
      'Op-based OR-Set',
      p(
        'The op-based OR-Set makes the "observed" part explicit. Prepare for `add(x)` generates a fresh tag. Prepare for `remove(x)` reads the tags currently associated with x at the origin and puts them in the op. Effect for remove deletes exactly those tags.'
      ),
      code(
        'ts',
        'op-or-set.ts',
        `
type Tag = string;
export type SetOp<T> = { kind: 'add'; x: T; tag: Tag } | { kind: 'remove'; x: T; tags: Tag[] };

export class OpORSet<T> {
  private tags = new Map<T, Set<Tag>>();

  prepareAdd(x: T, tag: Tag): SetOp<T> {
    return { kind: 'add', x, tag };
  }
  prepareRemove(x: T): SetOp<T> {
    return { kind: 'remove', x, tags: [...(this.tags.get(x) ?? [])] };
  }

  apply(op: SetOp<T>) {
    const cur = this.tags.get(op.x) ?? new Set<Tag>();
    if (op.kind === 'add') cur.add(op.tag);
    else for (const t of op.tags) cur.delete(t);
    this.tags.set(op.x, cur);
  }

  has(x: T) {
    return (this.tags.get(x)?.size ?? 0) > 0;
  }
}
`
      ),
      p(
        "No tombstones are needed: under causal delivery, a remove is always applied after the adds whose tags it names, and a concurrent add's tag is not in the remove's list, so it survives regardless of order. That commutativity of concurrent effects is the whole correctness argument."
      ),
      callout(
        'rule',
        'How to check an op-based design',
        'List every pair of operation types. For each pair, assume they are concurrent and apply them in both orders. If the resulting states differ for any pair, the design does not converge. Causally ordered pairs are exempt.'
      )
    ),
    section(
      'pure',
      'Pure op-based CRDTs and causal stability',
      p(
        'In the designs above, prepare does real work (it inspects state to build the op). **Pure op-based CRDTs** (Baquero, Almeida and Shoker, 2014–2017) make prepare trivial: the op is just what the user did ("add x"). Replicas store ops in a partially ordered log (a **PO-Log**) and compute the current value from the log, using the causal relationships between ops to decide outcomes.'
      ),
      p(
        'The log would grow forever, except for **causal stability**: an op is causally stable at a replica once every replica has delivered it, so no future op can be concurrent with it. Stable ops can be folded into a compact state and dropped from the log. This is a general way to garbage-collect CRDT metadata: anything only needed to resolve concurrency becomes unnecessary once concurrency is impossible.'
      ),
      callout(
        'warn',
        'Stability needs everyone',
        "Knowing an op is stable requires hearing from every replica. One laptop that stays offline for a month blocks garbage collection for everyone. Production systems either tolerate the growth, expire replicas they haven't heard from (and reject their late ops), or use a server to decide what is safe to compact."
      ),
      check(
        'Why can a replica discard tombstones for operations that are causally stable?',
        [
          'Tombstones are only needed for display',
          'No future operation can be concurrent with a stable one, so the information needed to resolve concurrency with it is no longer needed',
          'Stable operations are always deletes',
          'The server has a backup'
        ],
        1,
        'Tombstones and tags exist to decide outcomes between concurrent operations. Once every replica has an op, every future op will causally follow it, so there is nothing left to resolve.'
      )
    ),
    section(
      'equivalence',
      'State-based vs op-based in practice',
      compare(
        'The two families',
        ['', 'State-based (CvRDT)', 'Op-based (CmRDT)'],
        ['Message content', 'Whole state (or a delta)', 'One operation'],
        ['Network needs', 'Eventual delivery only', 'Exactly-once, causal order'],
        ['Data type needs', 'Join-semilattice, inflationary updates', 'Concurrent effects commute'],
        ['Metadata', 'Per-replica entries, tombstones', 'Vector clocks on messages, dedupe state'],
        [
          'Good fit',
          'Gossip between servers, anti-entropy, unreliable links',
          'Collaborative editing with a sync server, append-only logs'
        ]
      ),
      p(
        'Shapiro et al. showed the two are equivalent in expressive power: each can emulate the other. Real libraries blend them. Yjs and Automerge send operations (or batches of them) for low latency, but their documents also behave like state: you can merge two full documents, and duplicates are ignored because every op has a unique id. That is the delta-state idea arrived at from the other direction.'
      ),
      flow({
        title: 'Hybrid sync: ops when connected, state when catching up',
        nodes: [
          { id: 'r1', label: 'Replica A', sub: 'local edit', col: 0, row: 0, tone: 'yellow' },
          { id: 'op', label: 'Op broadcast', sub: 'small, immediate', col: 2, row: 0, tone: 'yellow' },
          { id: 'r2', label: 'Replica B', sub: 'online', col: 4, row: 0, tone: 'purple' },
          { id: 'r3', label: 'Replica C', sub: 'back from offline', col: 0, row: 2, tone: 'red' },
          { id: 'sv', label: 'Summary', sub: 'version vector', col: 2, row: 2, tone: 'plain' },
          { id: 'diff', label: 'Missing ops', sub: 'computed diff', col: 4, row: 2, tone: 'purple' }
        ],
        edges: [
          { id: 'e1', from: 'r1', to: 'op' },
          { id: 'e2', from: 'op', to: 'r2' },
          { id: 'e3', from: 'r3', to: 'sv', label: 'what I have' },
          { id: 'e4', from: 'sv', to: 'diff' },
          { id: 'e5', from: 'diff', to: 'r3', label: 'catch up' }
        ],
        steps: [
          {
            title: 'Edit locally',
            text: 'A user edit on Replica A is applied locally first and gets a unique id (replica, counter).',
            nodes: ['r1']
          },
          {
            title: 'Broadcast the op',
            text: 'While peers are connected, A sends just that op. It is tiny and arrives in milliseconds.',
            nodes: ['op'],
            edges: ['e1']
          },
          {
            title: 'Apply on receipt',
            text: 'Replica B applies the op. Unique ids make duplicates harmless even if the transport retries.',
            nodes: ['r2'],
            edges: ['e2']
          },
          {
            title: 'A replica returns from offline',
            text: 'Replica C missed hundreds of ops. Replaying them one by one through causal broadcast would work but is slow.',
            nodes: ['r3']
          },
          {
            title: 'Exchange summaries',
            text: 'C sends a version vector: "I have A up to 120, B up to 37". The peer computes exactly which ops C lacks.',
            nodes: ['sv'],
            edges: ['e3', 'e4']
          },
          {
            title: 'Send the difference as one batch',
            text: "The missing ops go over as one encoded batch, already in causal order. C applies them and is current. This is how Yjs sync step 2 and Automerge's sync protocol work (module 7).",
            nodes: ['diff', 'r3'],
            edges: ['e5']
          }
        ]
      }),
      check(
        'Which statement about op-based CRDTs is true?',
        [
          'They work over any unreliable network without extra machinery',
          'All operations, even causally ordered ones, must commute',
          'Only concurrent operations need to commute, given causal delivery',
          'They cannot be garbage-collected'
        ],
        2,
        'Causal delivery orders dependent ops for you, so only concurrent effects must commute. They do need reliable exactly-once causal delivery, and can be compacted once ops are causally stable.'
      )
    ),
    section(
      'recap',
      'Recap',
      terms(
        ['Prepare / effect', 'Prepare runs at the origin and builds the op; effect runs everywhere and applies it.'],
        ['Reliable causal broadcast', 'Every op delivered exactly once to every replica, after all ops it depends on.'],
        ['Commutativity of concurrent ops', 'The convergence condition for op-based CRDTs.'],
        ['PO-Log', 'Partially ordered log of ops used by pure op-based CRDTs.'],
        ['Causal stability', 'An op every replica has delivered; nothing can be concurrent with it anymore.']
      ),
      h3('Next'),
      p(
        'Counters and sets are the warm-up. Module 5 tackles the hardest everyday case: two people typing into the same paragraph.'
      )
    )
  ]
};
