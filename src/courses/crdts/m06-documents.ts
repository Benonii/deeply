import type { ModulePack } from '../../../convex/lib/courseSchema';
import { callout, check, code, compare, flow, h3, p, section, terms, ul } from './b';

export const m06: ModulePack = {
  id: 'documents',
  n: 6,
  title: 'Document CRDTs & real libraries',
  kicker: 'JSON CRDTs, Automerge, Yjs, Loro, Diamond Types',
  minutes: 35,
  summary:
    'Apps need nested maps, lists and text, not single counters. This module shows how JSON-shaped CRDTs compose, and how the main open-source libraries represent and encode documents internally.',
  sections: [
    section(
      'json',
      'Composing CRDTs into a JSON document',
      p(
        'Kleppmann and Beresford\'s 2017 paper "A Conflict-Free Replicated JSON Datatype" gave the blueprint: a document is a tree of **maps** (keys → values), **lists** (sequence CRDTs) and **registers** (primitive values). Every object has a unique id; every operation names the object it targets by id, so edits inside nested structures don\'t interfere with edits elsewhere.'
      ),
      ul(
        '**Map keys** behave like multi-value or LWW registers: concurrent writes to the same key either keep both (exposed as conflicts) or pick a deterministic winner.',
        '**Lists** are sequence CRDTs (RGA-like): inserts reference element ids.',
        '**Text** is a list of characters, usually with run-length optimizations.',
        '**Nesting** works because a value can be a reference to another object id. Two users can concurrently edit different fields of the same nested object without conflict.'
      ),
      callout(
        'warn',
        'Concurrent object creation',
        'If Alice and Bob both run `doc.settings = {}` concurrently and then each sets a field, they created two different objects with different ids for the same key. The map keeps one as the winner and the other\'s fields vanish from view. The fix is a convention: create shared containers once (at document creation) and then only mutate inside them.'
      ),
      p(
        'Two more structures need special algorithms. **Rich-text formatting** (bold spans that grow and shrink with edits) is handled by Peritext (Litt, Lim, Kleppmann and van Hardenberg, 2022), which anchors format marks to character ids with explicit start/end expansion rules. **Moving** items in a tree without creating cycles is handled by the replicated tree move operation (Kleppmann et al., 2021), which orders moves by timestamp and undoes and redoes moves to apply them in a consistent order.'
      )
    ),
    section(
      'automerge',
      'Automerge: a hash-linked history of operations',
      p(
        '**Automerge** (Kleppmann, Ink & Switch and contributors; core in Rust with JavaScript bindings) models a document as the result of applying a set of **changes**. A change is a batch of operations made in one local transaction, with:'
      ),
      ul(
        'an **actor id** (the replica) and a sequence number,',
        '**dependencies**: hashes of the changes this one was made on top of, forming a DAG like Git commits,',
        'a list of **ops**, each with an op id `counter@actor`. Ops target an object id and, for lists and text, an element id to insert after (RGA-style).'
      ),
      p(
        'Concurrent writes to the same map key are both kept. Reading returns a deterministic winner (the op with the highest op id), and `getConflicts` exposes the others. Because history is a hash DAG, two replicas can sync by comparing which change hashes they have (module 7).'
      ),
      code(
        'ts',
        'automerge-basics.ts',
        `
import * as Automerge from '@automerge/automerge';

type Doc = { title: string; tasks: { text: string; done: boolean }[] };

let alice = Automerge.from<Doc>({ title: 'Launch', tasks: [] });
let bob = Automerge.clone(alice);

alice = Automerge.change(alice, 'add task', (d) => {
  d.tasks.push({ text: 'Write docs', done: false });
});
bob = Automerge.change(bob, 'rename', (d) => {
  d.title = 'Launch v2';
});
alice = Automerge.change(alice, 'rename too', (d) => {
  d.title = 'Big launch';
});

const merged = Automerge.merge(alice, bob);
console.log(merged.tasks.length); // 1: the list edit merged cleanly
console.log(merged.title); // a deterministic winner of the two concurrent titles
console.log(Automerge.getConflicts(merged, 'title')); // both values, keyed by op id

const bytes = Automerge.save(merged); // compact binary with full history
const restored = Automerge.load<Doc>(bytes);
`,
        'API shown is Automerge 2.x/3.x JavaScript. Exact names of text helpers differ between versions; check the docs for the version you install.'
      ),
      callout(
        'deep',
        'The columnar format (approximate)',
        'Automerge\'s binary format stores ops column by column rather than row by row: all op ids together, all object ids together, all actions together, and so on. Each column is compressed with run-length, delta and LEB128 variable-length encoding. Typing a paragraph produces long runs of nearly identical values (same actor, counters increasing by 1, same object), which compress to a few bytes. That is why a document with its entire edit history can be only a small multiple of its plain-text size.'
      ),
      flow({
        title: 'Automerge changes form a DAG',
        nodes: [
          { id: 'c0', label: 'Change 0', sub: 'create doc', col: 0, row: 1, tone: 'plain' },
          { id: 'a1', label: 'Alice c1', sub: 'deps [c0]', col: 1, row: 0, tone: 'yellow' },
          { id: 'a2', label: 'Alice c2', sub: 'deps [a1]', col: 2, row: 0, tone: 'yellow' },
          { id: 'b1', label: 'Bob c1', sub: 'deps [c0]', col: 1, row: 2, tone: 'purple' },
          { id: 'm', label: 'Merge', sub: 'union of changes', col: 3, row: 1, tone: 'red' },
          { id: 'n', label: 'Next change', sub: 'deps [a2, b1]', col: 4, row: 1, tone: 'red' },
        ],
        edges: [
          { id: 'e1', from: 'c0', to: 'a1' },
          { id: 'e2', from: 'a1', to: 'a2' },
          { id: 'e3', from: 'c0', to: 'b1' },
          { id: 'e4', from: 'a2', to: 'm' },
          { id: 'e5', from: 'b1', to: 'm' },
          { id: 'e6', from: 'm', to: 'n' },
        ],
        steps: [
          { title: 'Every change has a hash', text: 'The initial change creates the document. Its hash identifies it everywhere, like a Git commit.', nodes: ['c0'] },
          { title: 'Alice builds on it', text: 'Alice makes two changes. Each lists the hash of the change it was made on top of, so her history is a chain.', nodes: ['a1', 'a2'], edges: ['e1', 'e2'] },
          { title: 'Bob builds concurrently', text: 'Bob\'s change also depends only on c0. The DAG now has two heads: a2 and b1. That is what "concurrent" looks like in Automerge.', nodes: ['b1'], edges: ['e3'] },
          { title: 'Merge = union of changes', text: 'Merging two documents is taking the union of their change sets and applying any ops the local replica hasn\'t applied. Ops have unique ids, so applying a change twice is a no-op.', nodes: ['m'], edges: ['e4', 'e5'] },
          { title: 'The next change joins the heads', text: 'Whoever edits next records both heads as dependencies. The DAG converges back to one head, recording that this edit saw both histories.', nodes: ['n'], edges: ['e6'] },
        ],
      }),
      check(
        'Alice and Bob concurrently set `doc.title` in Automerge. After merging, what can the app observe?',
        [
          'Only the later write by wall-clock time',
          'A deterministic winner as `doc.title`, with both values available through getConflicts',
          'An exception until someone resolves the conflict',
          'An array containing both titles',
        ],
        1,
        'Automerge keeps both assignments. Reads return the op with the highest op id, identical on every replica, and getConflicts exposes the full set so the app can show or resolve them.'
      )
    ),
    section(
      'yjs',
      'Yjs: items, state vectors and delete sets',
      p(
        '**Yjs** (Kevin Jahns) is a JavaScript CRDT library widely used in editors (ProseMirror, Tiptap, Monaco, CodeMirror bindings). A `Y.Doc` holds named shared types: `Y.Text`, `Y.Array`, `Y.Map`, `Y.XmlFragment`. Internally:'
      ),
      ul(
        'Every insertion is an **Item** with id `(clientID, clock)`, `origin` and `rightOrigin` (YATA, module 5), a `parent` (which shared type or nested type it belongs to), an optional `parentSub` (the key, for maps), and **content** (a string run, JSON values, a nested type, binary data...).',
        'Items for each client are kept in the **StructStore**, an array per client sorted by clock. Clocks for one client are contiguous: an item of length 5 starting at clock 10 covers clocks 10–14.',
        'A **state vector** maps each client to the next clock it expects: "I have client 17 up to clock 342". It is the compressed causal context of the whole document.',
        'Deletions are not items. They are recorded in a **delete set**: ranges of (client, clock) that are deleted. An update is the new items plus a delete set.'
      ),
      code(
        'ts',
        'yjs-sync.ts',
        `
import * as Y from 'yjs';

const a = new Y.Doc();
const b = new Y.Doc();

a.getText('body').insert(0, 'Hello');
b.getMap('meta').set('title', 'Notes');

// Each side asks only for what it is missing.
const missingForB = Y.encodeStateAsUpdate(a, Y.encodeStateVector(b));
const missingForA = Y.encodeStateAsUpdate(b, Y.encodeStateVector(a));
Y.applyUpdate(b, missingForB);
Y.applyUpdate(a, missingForA);

console.log(b.getText('body').toString()); // "Hello"
console.log(a.getMap('meta').get('title')); // "Notes"

// Live: every local transaction emits a small binary update to broadcast.
a.on('update', (update: Uint8Array, origin: unknown) => {
  if (origin !== 'remote') Y.applyUpdate(b, update, 'remote');
});
a.getText('body').insert(5, ' world'); // b receives it via the listener
`
      ),
      flow({
        title: 'Yjs two-step sync with state vectors',
        nodes: [
          { id: 'a', label: 'Doc A', sub: 'sv {1:10, 2:4}', col: 0, row: 0, tone: 'yellow' },
          { id: 'b', label: 'Doc B', sub: 'sv {1:6, 2:9}', col: 4, row: 0, tone: 'purple' },
          { id: 's1', label: 'Step 1', sub: 'send state vector', col: 2, row: 0, tone: 'plain' },
          { id: 'diffB', label: 'B computes diff', sub: 'client 2: clocks 4–8', col: 3, row: 2, tone: 'purple' },
          { id: 'diffA', label: 'A computes diff', sub: 'client 1: clocks 6–9', col: 1, row: 2, tone: 'yellow' },
          { id: 'done', label: 'Both', sub: 'sv {1:10, 2:9}', col: 2, row: 3, tone: 'red' },
        ],
        edges: [
          { id: 'e1', from: 'a', to: 's1', label: 'A\'s sv' },
          { id: 'e2', from: 's1', to: 'b' },
          { id: 'e3', from: 'b', to: 'diffB' },
          { id: 'e4', from: 'diffB', to: 'done', label: 'update' },
          { id: 'e5', from: 'a', to: 'diffA' },
          { id: 'e6', from: 'diffA', to: 'done', label: 'update' },
        ],
        steps: [
          { title: 'Each doc has a state vector', text: 'A has client 1 up to clock 10 and client 2 up to 4 (exclusive). B has client 1 up to 6 and client 2 up to 9.', nodes: ['a', 'b'] },
          { title: 'Sync step 1: send your state vector', text: 'A sends {1:10, 2:4} to B (and B sends its vector to A). These are a few bytes regardless of document size.', nodes: ['s1'], edges: ['e1', 'e2'] },
          { title: 'B computes what A lacks', text: 'A has client 2 only up to clock 4, B has up to 9. B encodes items from client 2 with clocks 4–8, plus its whole delete set.', nodes: ['diffB'], edges: ['e3'] },
          { title: 'A computes what B lacks', text: 'Symmetrically, A sends client 1\'s items for clocks 6–9.', nodes: ['diffA'], edges: ['e5'] },
          { title: 'Sync step 2: apply updates', text: 'Each side applies the update it received. Items whose origins are already present integrate immediately; anything else waits in a pending queue until its dependencies arrive.', nodes: ['done'], edges: ['e4', 'e6'] },
          { title: 'Then stream', text: 'After the handshake, each local transaction produces an incremental update that is broadcast as-is. Applying an update twice is harmless because items are identified by (client, clock).', nodes: ['done'] },
        ],
      }),
      check(
        'In Yjs, how is a deletion represented in an update?',
        ['As a special delete Item with its own id', 'As a range in the delete set: (client, clock range) marked deleted', 'By removing the item from the StructStore and sending the new state', 'As a tombstone character in the text'],
        1,
        'Deletes do not create new items or consume clocks. The delete set records which existing item clocks are deleted, compressed as ranges. That keeps deletes cheap and idempotent.'
      )
    ),
    section(
      'loro-dt',
      'Loro and Diamond Types: the newer generation',
      p(
        '**Loro** (Rust, with JS/WASM bindings) offers text (using Fugue), rich text, lists, movable lists, maps and a movable tree. It records history as an event graph and focuses on fast import/export and shallow snapshots that skip old history. Treat specifics as approximate and check its docs; the project moves quickly.'
      ),
      p(
        '**Diamond Types** (Seph Gentle) introduced **Eg-walker** (Gentle and Kleppmann, "Collaborative Text Editing with Eg-walker: Better, Faster, Smaller", 2024/2025). It stores the original index-based operations ("insert \'x\' at 5") together with their causal parents, an **event graph**. Most of the time edits are sequential and are applied directly, like a plain text buffer. Only when merging concurrent branches does it replay the concurrent part into a temporary CRDT structure to transform indexes, then throw that structure away.'
      ),
      callout(
        'insight',
        'CRDT correctness, OT-like footprint',
        'Eg-walker keeps no permanent per-character metadata in memory during normal editing, so steady-state memory and load time look like OT or a plain buffer. Yet it is still peer-to-peer and convergent like a CRDT, because the merge is computed from the event graph, which every replica shares.'
      ),
      compare(
        'Libraries compared (approximate, mid-2020s)',
        ['', 'Automerge', 'Yjs', 'Loro', 'Diamond Types'],
        ['Core language', 'Rust (JS via WASM)', 'JavaScript (Rust port: Yrs)', 'Rust (JS via WASM)', 'Rust'],
        ['Text algorithm', 'RGA-based', 'YATA', 'Fugue', 'Eg-walker'],
        ['Data model', 'JSON doc: maps, lists, text, counters', 'Shared types: Text, Array, Map, Xml', 'Text, rich text, list, movable list, map, tree', 'Plain text (primary)'],
        ['History', 'Full hash-linked change DAG', 'Optional (snapshots, undo manager)', 'Event graph, shallow snapshots', 'Event graph'],
        ['Concurrent map writes', 'Winner + conflicts exposed', 'One winner', 'One winner (LWW)', 'n/a'],
        ['Typical use', 'Local-first apps, version control-like workflows', 'Editors, presence, large ecosystem', 'Apps needing trees and movable lists', 'Text editing research and products']
      ),
      check(
        'What does Eg-walker keep permanently that a classic sequence CRDT like RGA does not need, and what does it avoid?',
        [
          'It keeps per-character ids forever and avoids an event graph',
          'It keeps the event graph of original ops and avoids keeping per-character CRDT metadata in memory during normal editing',
          'It keeps a central server log and avoids peers',
          'It keeps only the latest text and avoids history',
        ],
        1,
        'Eg-walker\'s persistent state is the event graph. CRDT state is constructed temporarily only to merge concurrent branches, then discarded.'
      )
    ),
    section(
      'choosing',
      'Choosing a library',
      ul(
        '**Rich text editor with a big ecosystem** (ProseMirror, Tiptap, Lexical, CodeMirror): Yjs has the most mature bindings and providers.',
        '**Local-first app where the document is your data model**, with history, branching and offline-first storage: Automerge (with automerge-repo for storage and sync) or Loro.',
        '**Trees and reordering** (outliners, file trees, kanban columns): Loro\'s movable tree and list, or the tree move algorithm on top of another library.',
        '**Server-authoritative app that only needs collaborative text in one field**: embed a Yjs or Automerge document in that field and keep the rest of your data in your normal backend (module 8).'
      ),
      callout(
        'rule',
        'Benchmark with your editing pattern',
        'Performance claims in CRDT land depend heavily on the trace: long sequential typing, many small concurrent edits, huge pastes, deep nesting. Load a realistic document with realistic history and measure load time, memory, and update size in your target runtime before committing.'
      ),
      check(
        'Two users concurrently create `doc.profile = {}` and then each set a different field inside it. What typically happens?',
        [
          'Both fields appear in one merged profile object',
          'Two distinct objects were created for one key; one wins and the other\'s field is hidden',
          'The document fails to merge',
          'Both objects are merged field by field automatically',
        ],
        1,
        'Each assignment creates a new object with a new id. The key\'s concurrent writes resolve to one object, so fields set on the losing object disappear from view. Create shared containers once, then mutate inside them.'
      )
    ),
    section(
      'recap',
      'Recap',
      terms(
        ['JSON CRDT', 'A tree of maps, lists and registers, each with an id, composed so edits target objects by id.'],
        ['Automerge change', 'A batch of ops with actor, seq and dependency hashes; changes form a DAG.'],
        ['Op id', 'counter@actor: unique id of an Automerge operation.'],
        ['Yjs Item', 'An inserted run with id (client, clock), origin, rightOrigin, parent and content.'],
        ['State vector', 'Map client → next clock; Yjs\'s compressed causal context.'],
        ['Delete set', 'Ranges of (client, clock) marked deleted.'],
        ['Eg-walker', 'Stores the event graph; builds CRDT state only to merge concurrent edits.'],
        ['Peritext', 'Algorithm for collaborative rich-text formatting spans.']
      ),
      h3('Next'),
      p('A CRDT library is one component. Module 7 assembles a full local-first app: storage, sync servers, presence, permissions and schema changes.')
    ),
  ],
};
