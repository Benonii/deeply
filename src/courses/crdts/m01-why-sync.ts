import type { ModulePack } from '../../../convex/lib/courseSchema';
import { callout, check, code, compare, flow, ol, p, section, terms, ul, h3 } from './b';

export const m01: ModulePack = {
  id: 'why-sync',
  n: 1,
  title: 'Why sync is hard',
  kicker: 'Replicas, partitions and what "consistent" can mean',
  minutes: 25,
  summary:
    'Why apps keep copies of data on many devices, what goes wrong when those copies change independently, and the precise guarantee CRDTs give you: strong eventual consistency.',
  sections: [
    section(
      'replicas',
      'Every app is a distributed system',
      p(
        'The moment your data lives in more than one place, you have a distributed system. A phone with an offline cache, a browser tab with optimistic state, a server with a read replica: each holds a **replica**, a full or partial copy of the same logical data.'
      ),
      p(
        'Replicas exist for three reasons: **latency** (reading local memory takes microseconds, a round trip to a server takes 50–300 ms), **availability** (the app keeps working on a plane or in a tunnel), and **fault tolerance** (one machine dying doesn\'t lose the data).'
      ),
      p(
        'The cost is that replicas can change independently. If Alice edits a document on her laptop while Bob edits the same document on his phone, and neither can reach the other, there are now two different versions. Sync is the problem of getting them back to one, without losing either person\'s work and without needing both to be online at once.'
      ),
      callout(
        'analogy',
        'Two notebooks',
        'Picture two people keeping the same shopping list in separate paper notebooks. Each adds and crosses off items during the day. In the evening they compare notebooks. A good set of rules lets them produce the same merged list no matter who reads first, how many times they compare, or in what order they look at each change. CRDTs are those rules, made precise enough for a computer.'
      ),
      terms(
        ['Replica', 'A copy of shared data held by one device or process. Each replica accepts reads and (in the systems this course covers) writes locally.'],
        ['Partition', 'A period when some replicas cannot communicate. Offline mode is a partition of one device from everyone else.'],
        ['Divergence', 'Replicas holding different states because they have seen different updates.'],
        ['Convergence', 'Replicas that have seen the same set of updates end up in the same state.']
      )
    ),
    section(
      'cap',
      'CAP and PACELC: the trade you cannot avoid',
      p(
        'The **CAP theorem** (Brewer 2000, proved by Gilbert and Lynch 2002) says that during a network **P**artition a system must choose between **C**onsistency (here meaning linearizability: every read sees the latest write) and **A**vailability (every request to a non-failed replica gets a response). You cannot have both while the network is split.'
      ),
      p(
        '**PACELC** (Abadi 2010) adds the part CAP leaves out: **E**lse, when there is no partition, you still trade **L**atency against **C**onsistency. A linearizable write must wait for coordination (a round trip to a leader or a quorum); a local-first write returns immediately.'
      ),
      compare(
        'Where common designs sit',
        ['System style', 'During a partition', 'Normal operation', 'Example'],
        ['Single leader, synchronous', 'Unavailable for writes away from the leader', 'Consistent, pays a round trip per write', 'Postgres primary, Convex'],
        ['Quorum replication', 'Available only on the majority side', 'Consistent reads/writes cost a quorum round trip', 'etcd, Spanner (with TrueTime)'],
        ['Leaderless, last-writer-wins', 'Available everywhere', 'Fast, but silently drops concurrent writes', 'Cassandra default'],
        ['CRDT / local-first', 'Available everywhere, including offline', 'Fast, merges concurrent writes deterministically', 'Yjs, Automerge, Riak data types']
      ),
      callout(
        'insight',
        'CRDTs pick availability, then make it safe',
        'CRDTs do not beat CAP. They choose A and L (every replica accepts writes immediately) and then replace "consistency" with a weaker but still precise guarantee: replicas that have received the same updates are in the same state. The art is designing data types whose merge does what users expect.'
      )
    ),
    section(
      'models',
      'A ladder of consistency models',
      p(
        'Consistency models are contracts about what reads may return. Stronger contracts are easier to program against and more expensive to provide. From strongest to weakest:'
      ),
      ol(
        '**Linearizability**: every operation appears to take effect at one instant between its start and end, in real-time order. Behaves like a single copy.',
        '**Sequential consistency**: all replicas agree on one total order of operations that respects each client\'s program order, but not necessarily real time.',
        '**Causal consistency**: operations that are causally related (one could have influenced the other) are seen in the same order everywhere. Concurrent operations may be seen in different orders.',
        '**Eventual consistency**: if writes stop, replicas *eventually* agree. Says nothing about what you see in the meantime, or how conflicts are resolved.',
        '**Strong eventual consistency (SEC)**: eventual consistency plus a guarantee that any two replicas that have delivered the same set of updates are in the same state, immediately, with no rollback or conflict-resolution round.'
      ),
      p(
        'Causal consistency is the strongest model that can remain available under partition (Mahajan, Alvisi and Dahlin 2011 showed "real-time causal" is the strongest such model). This is why causality is the backbone of almost every CRDT design, and why module 2 is about clocks.'
      ),
      check(
        'Alice posts "Is anyone free for lunch?" and Bob replies "Yes!". Carol sees Bob\'s reply but not Alice\'s question. Which model forbids this?',
        ['Eventual consistency', 'Causal consistency', 'Strong eventual consistency alone', 'None of them; this is always allowed'],
        1,
        'Bob\'s reply causally depends on Alice\'s message (he read it before replying). Causal consistency requires every replica to show the question before the answer. Plain eventual consistency and SEC only constrain the end state, not the order you observe things in.'
      )
    ),
    section(
      'sec',
      'Strong eventual consistency, precisely',
      p(
        'Shapiro, Preguiça, Baquero and Zawirski defined CRDTs in 2011 around three properties. A system provides strong eventual consistency when:'
      ),
      ul(
        '**Eventual delivery**: every update delivered to one correct replica is eventually delivered to every correct replica.',
        '**Convergence**: correct replicas that have delivered the same updates have equivalent state.',
        '**Termination**: every method execution terminates (no unbounded waiting or consensus rounds).'
      ),
      p(
        'Notice what is *not* required: no agreement on a global order, no leader, no locks, no "conflict detected, please choose" step. Merging is a deterministic function of the updates seen, so two replicas never need to talk to each other to agree on what the merge is.'
      ),
      flow({
        title: 'Two offline replicas diverge, then converge',
        nodes: [
          { id: 'a0', label: 'Alice', sub: 'list = [milk]', col: 0, row: 0, tone: 'yellow' },
          { id: 'b0', label: 'Bob', sub: 'list = [milk]', col: 0, row: 2, tone: 'purple' },
          { id: 'a1', label: 'Alice edits', sub: 'add eggs', col: 1, row: 0, tone: 'yellow' },
          { id: 'b1', label: 'Bob edits', sub: 'remove milk', col: 1, row: 2, tone: 'purple' },
          { id: 'net', label: 'Reconnect', sub: 'exchange updates', col: 2, row: 1, tone: 'plain' },
          { id: 'a2', label: 'Alice merges', sub: 'apply Bob\'s op', col: 3, row: 0, tone: 'yellow' },
          { id: 'b2', label: 'Bob merges', sub: 'apply Alice\'s op', col: 3, row: 2, tone: 'purple' },
          { id: 'eq', label: 'Same state', sub: 'list = [eggs]', col: 4, row: 1, tone: 'red' },
        ],
        edges: [
          { id: 'e1', from: 'a0', to: 'a1', label: 'offline' },
          { id: 'e2', from: 'b0', to: 'b1', label: 'offline' },
          { id: 'e3', from: 'a1', to: 'net' },
          { id: 'e4', from: 'b1', to: 'net' },
          { id: 'e5', from: 'net', to: 'a2' },
          { id: 'e6', from: 'net', to: 'b2' },
          { id: 'e7', from: 'a2', to: 'eq' },
          { id: 'e8', from: 'b2', to: 'eq' },
        ],
        steps: [
          { title: 'Shared starting point', text: 'Both replicas start from the same state: a list containing only "milk". Each has a full copy and can read it with no network.', nodes: ['a0', 'b0'] },
          { title: 'Independent edits', text: 'Alice adds "eggs" while offline. Bob removes "milk" while offline. Both edits succeed locally and instantly. The replicas have now diverged.', nodes: ['a1', 'b1'], edges: ['e1', 'e2'] },
          { title: 'Exchange updates', text: 'When they reconnect, each sends the updates the other hasn\'t seen. It does not matter who sends first, whether a message arrives twice, or whether they sync through a server or directly.', nodes: ['net'], edges: ['e3', 'e4'] },
          { title: 'Apply the other side\'s updates', text: 'Each replica applies the updates it was missing using the data type\'s merge rules. Neither asks the other which result to pick; the rules are deterministic.', nodes: ['a2', 'b2'], edges: ['e5', 'e6'] },
          { title: 'Convergence', text: 'Both now hold ["eggs"]. That is strong eventual consistency: same set of updates delivered, same state, with no extra coordination round.', nodes: ['eq'], edges: ['e7', 'e8'] },
          { title: 'What the rules must decide', text: 'Here the edits touched different items, so the outcome is obvious. The hard cases are when concurrent edits touch the same thing: Alice re-adds milk while Bob removes it. Each CRDT encodes a policy for those cases (add-wins, remove-wins, last-writer-wins, keep both).', nodes: ['a2', 'b2', 'eq'] },
        ],
      })
    ),
    section(
      'strategies',
      'Five ways to handle concurrent writes',
      compare(
        'Conflict strategies compared',
        ['Strategy', 'How it works', 'What you lose'],
        ['Prevent (locks / single leader)', 'Only one place accepts writes; others wait or fail', 'Offline writes and low latency'],
        ['Last-writer-wins (LWW)', 'Keep the write with the highest timestamp, drop the rest', 'Concurrent writes silently disappear; depends on clocks'],
        ['Manual resolution', 'Keep all versions as "siblings" and ask the app or user to pick', 'Pushes complexity to every reader (CouchDB, early Riak, Dynamo shopping cart)'],
        ['Operational transformation (OT)', 'Rewrite each incoming operation against concurrent ones so it still means the same thing', 'Needs a central server in practice; transformation functions are notoriously hard to get right'],
        ['CRDTs', 'Design data types whose concurrent updates commute, so merge is automatic and deterministic', 'Metadata overhead; some invariants (uniqueness, non-negative balances) are impossible without coordination']
      ),
      callout(
        'warn',
        'LWW is a CRDT too, and that is the trap',
        'A last-writer-wins register technically converges, so it satisfies SEC. But "converges" is not "correct": if two people edit a paragraph at the same time, LWW keeps one and throws the other away without telling anyone. Convergence is the minimum bar. The real question for every CRDT is whether the converged state is the one users intended.'
      ),
      check(
        'Which property does a CRDT give you that plain eventual consistency does not?',
        [
          'Replicas agree on a single total order of writes',
          'Replicas that received the same updates are in the same state, with no extra resolution step',
          'Reads always return the latest write',
          'Writes are rejected during a partition',
        ],
        1,
        'Eventual consistency only promises agreement once writes stop, and may require background repair or manual conflict resolution. SEC guarantees immediate equality for equal sets of delivered updates. No total order is needed; that is exactly what CRDTs avoid.'
      )
    ),
    section(
      'naive',
      'Why the naive approach fails',
      p(
        'The obvious way to sync is to send the whole new state and overwrite the old one. Here is what happens with a counter that two replicas increment while offline.'
      ),
      code(
        'ts',
        'naive-sync.ts',
        `
type Replica = { count: number };

const alice: Replica = { count: 5 };
const bob: Replica = { count: 5 };

// Both increment while offline.
alice.count += 1; // 6
bob.count += 1;   // 6

// "Sync" by overwriting with the other side's value.
function overwrite(target: Replica, source: Replica) {
  target.count = source.count;
}
overwrite(alice, bob);
overwrite(bob, alice);

console.log(alice.count, bob.count); // 6 6, but two increments happened: should be 7
`,
        'Both replicas converge, and both are wrong. Overwriting loses one increment. The fix (module 3) is to store more information: one counter per replica, merged with max.'
      ),
      p(
        'Adding the two values instead (6 + 6 = 12) is also wrong, and worse: if the same sync message is delivered twice, the count grows again. A correct merge must be **idempotent** (applying it twice is harmless), **commutative** (order doesn\'t matter) and **associative** (grouping doesn\'t matter). Module 3 shows these three properties are exactly what make a state-based CRDT.'
      ),
      check(
        'A sync protocol may deliver the same message more than once. Which property must the merge have to make that safe?',
        ['Commutativity', 'Associativity', 'Idempotence', 'Monotonic timestamps'],
        2,
        'Idempotence means merge(x, x) = x, so receiving the same state twice changes nothing. Commutativity handles different orders and associativity handles different groupings, but duplicates need idempotence.'
      )
    ),
    section(
      'server-vs-p2p',
      'Server-authoritative vs replicated sync',
      p(
        'Many "realtime" products (Convex, Firebase, Linear\'s sync engine) do not use CRDTs at their core. They keep one authoritative copy on a server that orders every write, and clients hold caches plus optimistic guesses. That design is simpler and can enforce any invariant, because one place sees every write in order. CRDTs are the tool when you need writes to succeed with no authority reachable: offline-first apps, peer-to-peer collaboration, multi-region active-active databases.'
      ),
      flow({
        title: 'Where the merge decision happens',
        nodes: [
          { id: 'c1', label: 'Client A', sub: 'optimistic write', col: 0, row: 0, tone: 'yellow' },
          { id: 'c2', label: 'Client B', sub: 'optimistic write', col: 0, row: 2, tone: 'yellow' },
          { id: 'srv', label: 'Server', sub: 'serializes writes', col: 2, row: 1, tone: 'red' },
          { id: 'r1', label: 'Replica A', sub: 'merge locally', col: 4, row: 0, tone: 'purple' },
          { id: 'r2', label: 'Replica B', sub: 'merge locally', col: 4, row: 2, tone: 'purple' },
          { id: 'mesh', label: 'Any transport', sub: 'p2p / relay / USB', col: 3, row: 1, tone: 'plain' },
        ],
        edges: [
          { id: 'w1', from: 'c1', to: 'srv', label: 'mutation' },
          { id: 'w2', from: 'c2', to: 'srv', label: 'mutation' },
          { id: 'x1', from: 'r1', to: 'mesh', label: 'updates' },
          { id: 'x2', from: 'mesh', to: 'r2', label: 'updates' },
        ],
        steps: [
          { title: 'Server-authoritative: clients propose', text: 'Clients apply a write locally as a guess (an optimistic update) and send it to the server. The local guess may be thrown away.', nodes: ['c1', 'c2'], edges: ['w1', 'w2'] },
          { title: 'The server decides the order', text: 'The server runs writes one at a time (or as serializable transactions). It can reject a write that breaks a rule, like "username already taken". Every client then sees the server\'s result.', nodes: ['srv'] },
          { title: 'Replicated: every replica is authoritative for its own writes', text: 'In a CRDT system, a write on Replica A is final the moment it happens. There is no later rejection, which is why offline edits never get "bounced".', nodes: ['r1'] },
          { title: 'Updates flow over any path', text: 'Updates can travel through a relay server, directly peer to peer, or even on a USB stick. The server, if there is one, only stores and forwards; it does not decide outcomes.', nodes: ['mesh'], edges: ['x1', 'x2'] },
          { title: 'Merge is local and deterministic', text: 'Each replica merges what it receives using the data type\'s rules and lands on the same result. The price: rules that need a global view, such as uniqueness, cannot be enforced this way (module 8).', nodes: ['r2', 'r1'] },
        ],
      }),
      check(
        'Your app must guarantee that no two users ever claim the same username. Which design fits?',
        ['A CRDT set of usernames merged with add-wins', 'A server that serializes claims and rejects duplicates', 'Last-writer-wins on a username register', 'Peer-to-peer sync with vector clocks'],
        1,
        'Uniqueness requires knowing about every concurrent claim before accepting one, which is coordination. A CRDT will accept both claims offline and can only detect the clash after the fact.'
      )
    ),
    section(
      'recap',
      'Recap',
      ul(
        'Replication buys latency, availability and durability, at the cost of divergence.',
        'CAP: under partition choose consistency or availability. PACELC: without partition, choose consistency or latency.',
        'Causal consistency is the strongest model that stays available, so causality tracking underpins CRDTs.',
        'Strong eventual consistency: same updates delivered → same state, with no resolution round.',
        'Merges must be idempotent, commutative and associative to survive duplicates, reordering and regrouping.',
        'Converging is necessary but not sufficient: the merged result must also match user intent.'
      ),
      h3('Next'),
      p('To merge correctly you need to know which updates happened *before* others and which were concurrent. Module 2 builds that from first principles.')
    ),
  ],
};
