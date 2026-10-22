import type { ModulePack } from '../../../convex/lib/courseSchema';
import { callout, check, code, compare, flow, h3, p, section, terms, ul } from './b';

export const m05: ModulePack = {
  id: 'sequences',
  n: 5,
  title: 'Sequence CRDTs for text',
  kicker: 'RGA, Logoot/LSEQ, YATA, Fugue, tombstones',
  minutes: 40,
  summary:
    'Collaborative text is the hardest common CRDT. Indexes shift under concurrent edits, so every character needs a stable identity and a deterministic place relative to its neighbors.',
  sections: [
    section(
      'indexes',
      'Why indexes don\'t work',
      p(
        'A naive text op says "insert \'x\' at index 3". If Alice inserts at index 3 while Bob concurrently deletes index 1, Alice\'s index now points one character too far on Bob\'s replica. Indexes are relative to a document state, and concurrent replicas have different states.'
      ),
      p(
        'Operational transformation fixes this by rewriting indexes against concurrent ops. Sequence CRDTs fix it differently: **give every character a unique, immutable id**, and express inserts relative to ids ("insert \'x\' after character A:17") instead of positions. Ids never shift, so concurrent ops refer to the same things on every replica.'
      ),
      p(
        'Two questions remain, and the main algorithms answer them differently: where exactly does a new character go when several replicas insert at the same spot concurrently, and what happens to deleted characters that others may still reference?'
      ),
      callout(
        'analogy',
        'Pins, not page numbers',
        'Telling someone "add a note on page 12" breaks if they inserted pages. Telling them "add a note right after the paragraph that starts \'Chapter 3\'" keeps working. Sequence CRDTs pin every edit to an anchor that never moves.'
      )
    ),
    section(
      'rga',
      'RGA: insert after an id, newest first',
      p(
        '**RGA** (Replicated Growable Array, Roh et al. 2011) stores characters in a list. Each has an id (Lamport counter, replica id). An insert names the id of the character it goes after. To integrate an insert: find the reference character, then **skip past every following character whose id is greater** than the new one, and insert there. Deletes only mark a character as a **tombstone**; it stays in the list so later inserts can still reference it.'
      ),
      code(
        'ts',
        'rga.ts',
        `
type Id = { c: number; r: string }; // Lamport counter, replica
const greater = (a: Id, b: Id) => a.c > b.c || (a.c === b.c && a.r > b.r);
const same = (a: Id | null, b: Id | null) => !!a && !!b && a.c === b.c && a.r === b.r;

type El = { id: Id; ch: string; deleted: boolean };
export type Op =
  | { kind: 'ins'; id: Id; after: Id | null; ch: string }
  | { kind: 'del'; id: Id };

export class RGA {
  private els: El[] = [];
  private clock = 0;
  constructor(private replica: string) {}

  /** Local insert at a visible position (0 = start). Returns the op to broadcast. */
  insert(pos: number, ch: string): Op {
    const visible = this.els.filter((e) => !e.deleted);
    const after = pos === 0 ? null : visible[pos - 1].id;
    const op: Op = { kind: 'ins', id: { c: ++this.clock, r: this.replica }, after, ch };
    this.apply(op);
    return op;
  }

  remove(pos: number): Op {
    const op: Op = { kind: 'del', id: this.els.filter((e) => !e.deleted)[pos].id };
    this.apply(op);
    return op;
  }

  /** Requires causal delivery: the referenced character must already exist. */
  apply(op: Op) {
    if (op.kind === 'del') {
      const el = this.els.find((e) => same(e.id, op.id));
      if (el) el.deleted = true;
      return;
    }
    if (this.els.some((e) => same(e.id, op.id))) return; // duplicate
    this.clock = Math.max(this.clock, op.id.c);
    let i = op.after ? this.els.findIndex((e) => same(e.id, op.after)) + 1 : 0;
    while (i < this.els.length && greater(this.els[i].id, op.id)) i++;
    this.els.splice(i, 0, { id: op.id, ch: op.ch, deleted: false });
  }

  text() {
    return this.els.filter((e) => !e.deleted).map((e) => e.ch).join('');
  }
}

// Two replicas insert at the same spot concurrently.
const a = new RGA('A');
const b = new RGA('B');
const h = a.insert(0, 'H');
b.apply(h);
const x = a.insert(1, 'a'); // id {c:2, r:'A'}
const y = b.insert(1, 'o'); // id {c:2, r:'B'}
a.apply(y);
b.apply(x);
console.log(a.text(), b.text()); // "Hoa" "Hoa": B > A breaks the tie, newest/greatest goes first
`
      ),
      flow({
        title: 'Integrating concurrent inserts in RGA',
        nodes: [
          { id: 'h', label: '"H"', sub: 'id 1A', col: 0, row: 1, tone: 'plain' },
          { id: 'xa', label: 'Alice inserts "a"', sub: 'id 2A, after 1A', col: 1, row: 0, tone: 'yellow' },
          { id: 'yb', label: 'Bob inserts "o"', sub: 'id 2B, after 1A', col: 1, row: 2, tone: 'purple' },
          { id: 'skip', label: 'Skip rule', sub: 'skip ids > mine', col: 2, row: 1, tone: 'plain' },
          { id: 'ra', label: 'Alice applies 2B', sub: 'H a → H o a', col: 3, row: 0, tone: 'yellow' },
          { id: 'rb', label: 'Bob applies 2A', sub: 'H o → H o a', col: 3, row: 2, tone: 'purple' },
          { id: 'out', label: 'Both', sub: '"Hoa"', col: 4, row: 1, tone: 'red' },
        ],
        edges: [
          { id: 'e1', from: 'h', to: 'xa' },
          { id: 'e2', from: 'h', to: 'yb' },
          { id: 'e3', from: 'xa', to: 'skip' },
          { id: 'e4', from: 'yb', to: 'skip' },
          { id: 'e5', from: 'skip', to: 'ra' },
          { id: 'e6', from: 'skip', to: 'rb' },
          { id: 'e7', from: 'ra', to: 'out' },
          { id: 'e8', from: 'rb', to: 'out' },
        ],
        steps: [
          { title: 'Shared prefix', text: 'Both replicas hold "H" with id 1A (Lamport 1, replica A).', nodes: ['h'] },
          { title: 'Concurrent inserts at the same anchor', text: 'Alice types "a" after H; it gets id 2A. Bob, concurrently, types "o" after H; it gets id 2B. Both ops say "after 1A".', nodes: ['xa', 'yb'], edges: ['e1', 'e2'] },
          { title: 'The integration rule', text: 'Start right after the anchor and skip over existing characters whose id is greater than the new one. Ids compare by counter, then replica: 2B > 2A.', nodes: ['skip'], edges: ['e3', 'e4'] },
          { title: 'Alice receives "o" (2B)', text: 'After H sits "a" (2A). Is 2A > 2B? No, so stop and insert before it: "Hoa".', nodes: ['ra'], edges: ['e5'] },
          { title: 'Bob receives "a" (2A)', text: 'After H sits "o" (2B). 2B > 2A, so skip it. End of list: insert there: "Hoa".', nodes: ['rb'], edges: ['e6'] },
          { title: 'Same answer, no coordination', text: 'Both replicas computed "Hoa" from ids alone. The skip rule also keeps a run of characters typed by one user together, because each new character in a run has a higher id than the one before.', nodes: ['out'], edges: ['e7', 'e8'] },
        ],
      }),
      check(
        'In RGA, why are deleted characters kept as tombstones instead of being removed from the list?',
        [
          'To support undo',
          'Concurrent or delayed inserts may reference them as their anchor',
          'Because the list is append-only on disk',
          'To keep the document size constant',
        ],
        1,
        'An insert that arrives later may say "after character 7B". If 7B had been physically removed, the replica could not place the new character consistently with others.'
      )
    ),
    section(
      'logoot',
      'Logoot and LSEQ: dense identifiers',
      p(
        'A different family gives each character a **position identifier** from a dense, totally ordered space, so that between any two ids there is always room for another. Think fractional indexing: insert between 0.5 and 0.6 by picking 0.55. **Logoot** (Weiss, Urso and Molli 2009) uses lists of (digit, replica) pairs compared lexicographically; **LSEQ** (Nédelec et al. 2013) chooses digits with an adaptive strategy so ids stay short for common editing patterns. **Treedoc** uses paths in a binary tree.'
      ),
      p(
        'The appeal: the document is just characters sorted by id. No anchors, no tombstones needed for ordering (deletes remove the entry). The costs: ids can grow long in heavily edited regions, and these algorithms suffer badly from interleaving.'
      ),
      code(
        'ts',
        'fractional-ids.ts',
        `
// Simplified Logoot-style ids: arrays of [digit, replica], compared lexicographically.
type Pos = [number, string][];
const BASE = 100;

export function cmp(a: Pos, b: Pos): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i][0] !== b[i][0]) return a[i][0] - b[i][0];
    if (a[i][1] !== b[i][1]) return a[i][1] < b[i][1] ? -1 : 1;
  }
  return a.length - b.length;
}

/** Allocate a position strictly between lo and hi (hi may be undefined = end). */
export function between(lo: Pos, hi: Pos | undefined, replica: string): Pos {
  const out: Pos = [];
  for (let depth = 0; ; depth++) {
    const l = lo[depth]?.[0] ?? 0;
    const h = hi?.[depth]?.[0] ?? BASE;
    if (h - l > 1) {
      out.push([l + 1 + Math.floor(Math.random() * (h - l - 1)), replica]);
      return out;
    }
    out.push(lo[depth] ?? [0, replica]); // no room at this depth: copy and go deeper
  }
}
`,
        'Random choice inside the gap is what makes concurrent typing interleave: two users inserting words at the same spot get positions scattered through the same interval.'
      )
    ),
    section(
      'interleaving',
      'The interleaving anomaly',
      p(
        'Kleppmann, Gomes, Mulligan and Beresford (2019) named a correctness problem beyond convergence. Alice types "Hello" and Bob concurrently types "World" at the same position. Every replica converges, but the result might be "HWeolrllod": the two runs are interleaved character by character. Logoot and LSEQ interleave in this forward-typing case. RGA keeps forward-typed runs together but can interleave text typed backwards (each character inserted before the previous one). Treedoc and naive fractional indexing can interleave too.'
      ),
      p(
        '**Fugue** (Weidner, Gentle and Kleppmann, 2023) is designed to be *maximally non-interleaving*: it treats the document as a tree where each character is a left or right child of an existing character, and orders concurrent siblings so that runs from one user stay contiguous in both forward and backward typing. It is used in Loro\'s text type.'
      ),
      compare(
        'Sequence algorithms at a glance',
        ['Algorithm', 'Anchor', 'Forward interleaving', 'Backward interleaving', 'Notable users'],
        ['Logoot / LSEQ', 'Dense position id', 'Yes', 'Yes', 'Research systems'],
        ['RGA', 'Left neighbor id', 'No', 'Can interleave', 'Automerge (RGA-like list)'],
        ['YATA', 'Left and right origin', 'No', 'Mostly no (edge cases exist)', 'Yjs'],
        ['Fugue', 'Left or right parent in a tree', 'No', 'No (maximal non-interleaving)', 'Loro'],
        ['Eg-walker', 'Event graph replayed into a temporary CRDT', 'Depends on the CRDT used inside (Fugue-like)', 'No', 'Diamond Types']
      ),
      callout(
        'insight',
        'Convergence is necessary, not sufficient',
        'Every algorithm in that table converges. They differ in whether the converged text is what humans meant. When you evaluate a CRDT, ask what its concurrent edits produce, not just whether replicas agree.'
      ),
      check(
        'Alice types "cat" and Bob types "dog" at the same position at the same time. The CRDT converges to "cdaotg". What is this?',
        ['A convergence bug', 'An interleaving anomaly', 'A tombstone leak', 'Clock skew'],
        1,
        'Replicas agree, so convergence held. The problem is that concurrent runs were merged character by character, which no user intended.'
      )
    ),
    section(
      'yata',
      'YATA: the algorithm inside Yjs',
      p(
        '**YATA** (Nicolaescu, Jahns, Derntl and Klamma, 2016) is the algorithm Yjs implements. Each inserted item remembers both its **origin** (the item to its left when it was inserted) and its **rightOrigin** (the item to its right). To integrate a new item, Yjs scans the items currently between origin and rightOrigin. Any of them are concurrent insertions at the same spot, and YATA\'s rules order them using their own origins and, as a final tiebreak, client ids.'
      ),
      flow({
        title: 'YATA integration (simplified)',
        nodes: [
          { id: 'l', label: 'origin', sub: 'left at insert time', col: 0, row: 1, tone: 'plain' },
          { id: 'r', label: 'rightOrigin', sub: 'right at insert time', col: 4, row: 1, tone: 'plain' },
          { id: 'new', label: 'New item', sub: 'client 7, clock 12', col: 2, row: 0, tone: 'yellow' },
          { id: 'c1', label: 'Conflict 1', sub: 'same origin', col: 1, row: 2, tone: 'purple' },
          { id: 'c2', label: 'Conflict 2', sub: 'origin = Conflict 1', col: 2, row: 2, tone: 'purple' },
          { id: 'c3', label: 'Conflict 3', sub: 'same origin', col: 3, row: 2, tone: 'purple' },
          { id: 'place', label: 'Insert here', sub: 'deterministic slot', col: 3, row: 0, tone: 'red' },
        ],
        edges: [
          { id: 'e0', from: 'l', to: 'c1' },
          { id: 'e1', from: 'c1', to: 'c2' },
          { id: 'e2', from: 'c2', to: 'c3' },
          { id: 'e3', from: 'c3', to: 'r' },
          { id: 'e4', from: 'new', to: 'place' },
        ],
        steps: [
          { title: 'An item records two anchors', text: 'When a user types, Yjs creates an item with id (clientID, clock) and stores origin = left neighbor and rightOrigin = right neighbor at that moment.', nodes: ['new', 'l', 'r'] },
          { title: 'Find the conflict zone', text: 'On another replica, items may already sit between origin and rightOrigin. They were inserted concurrently into the same gap.', nodes: ['c1', 'c2', 'c3'], edges: ['e0', 'e1', 'e2', 'e3'] },
          { title: 'Items with the same origin', text: 'For an item with the same origin as the new one, order by client id: the lower client id goes left (approximate rule; see Yjs\'s Item.integrate for exact detail).', nodes: ['c1', 'c3'] },
          { title: 'Items anchored inside the zone', text: 'An item whose origin is another conflicting item (Conflict 2 hangs off Conflict 1) belongs to that item\'s run, so the new item is placed relative to the whole run, not in its middle. This keeps runs together.', nodes: ['c2'] },
          { title: 'Place and link', text: 'The new item is spliced into the doubly linked list at the slot the rules select. Every replica scanning the same items with the same rules picks the same slot.', nodes: ['place'], edges: ['e4'] },
          { title: 'Why two anchors', text: 'Storing rightOrigin as well as origin gives YATA enough information to avoid most interleaving that left-only schemes allow. The cost is one more id per item, which Yjs compresses heavily.', nodes: ['l', 'r'] },
        ],
      }),
      callout(
        'deep',
        'Runs, not characters',
        'Yjs does not store one object per character. Consecutive characters typed by the same client with consecutive clocks are merged into one item holding a string, and split only when an edit lands in the middle. A document with a million characters typed in long runs may hold only thousands of items. This is a large part of why Yjs is fast.'
      )
    ),
    section(
      'gc',
      'Tombstones and garbage collection',
      p(
        'Tombstoning means a document never shrinks: delete a 10 MB paste and the ids (and possibly content) remain. Libraries reduce the cost in layers:'
      ),
      ul(
        '**Drop deleted content, keep ids**: Yjs (with `doc.gc` enabled, the default) replaces the content of deleted items with lightweight GC markers; the ids and lengths stay so later ops can still be positioned.',
        '**Compress runs**: a deleted run of 10,000 characters by one client is one range, not 10,000 records.',
        '**Compact after stability**: once every replica has seen a delete (causal stability, module 4), its tombstone can in principle be removed entirely. In open systems where any old replica may reappear, few libraries do this automatically.',
        '**Snapshot and rebase**: some apps periodically start a new document from the current text and tell clients to discard history, trading away merges with very old offline replicas.'
      ),
      callout(
        'warn',
        'History is a feature and a liability',
        'Keeping every operation enables time travel, blame and offline merges from months ago. It also means deleted content may still be recoverable from the stored history. If users delete secrets, make sure your library and storage actually purge content, not just hide it.'
      ),
      check(
        'Yjs garbage collection is on. A user deletes a long paragraph. What remains in the document?',
        ['Nothing; the items are removed', 'The full deleted text, marked deleted', 'Compact markers preserving the ids and lengths of the deleted items, without their content', 'A copy in a separate undo log'],
        2,
        'With GC on, Yjs drops deleted content but keeps enough structure (ids and lengths) for concurrent and future ops to be integrated correctly.'
      ),
      check(
        'Why do Logoot-style algorithms not need tombstones to order characters?',
        [
          'Every character\'s position id alone determines its order, so nothing else references deleted characters',
          'They use vector clocks instead',
          'They never delete characters',
          'They rely on a server',
        ],
        0,
        'Order comes from comparing position ids directly, not from anchors. (They may still need to remember deletes to stay idempotent when an insert and its delete arrive out of order.)'
      )
    ),
    section(
      'recap',
      'Recap',
      terms(
        ['Stable character id', 'Unique (replica, counter) per character so edits reference identities, not shifting indexes.'],
        ['RGA', 'Insert after a left anchor; skip greater ids; tombstone deletes.'],
        ['Logoot / LSEQ', 'Dense position identifiers; simple but interleave concurrent runs.'],
        ['YATA', 'Left and right origins; Yjs\'s algorithm; items merged into runs.'],
        ['Fugue', 'Tree-based ordering designed for maximal non-interleaving; used by Loro.'],
        ['Interleaving anomaly', 'Concurrent runs merged character by character: converged but unintended.'],
        ['Tombstone', 'Deleted element kept so it can still be referenced.']
      ),
      h3('Next'),
      p('Text is one type. Real apps need maps, lists and text nested inside each other. Module 6 looks at how Automerge, Yjs, Loro and Diamond Types build whole documents.')
    ),
  ],
};
