import type { ModulePack } from '../../../convex/lib/courseSchema';
import { callout, check, code, compare, flow, h3, ol, p, section, terms, ul } from './b';

export const m07: ModulePack = {
  id: 'local-first',
  n: 7,
  title: 'Local-first architecture',
  kicker: 'Storage, sync servers, presence, permissions, migrations',
  minutes: 35,
  summary:
    'A CRDT is the merge function. A local-first app also needs durable local storage, a sync protocol, a server (or not), presence, access control and a way to change the schema without breaking old replicas.',
  sections: [
    section(
      'ideals',
      'What "local-first" promises',
      p(
        'Ink & Switch\'s 2019 essay "Local-first software: you own your data, in spite of the cloud" (Kleppmann, Wiggins, van Hardenberg, McGranaghan) lists seven ideals:'
      ),
      ol(
        '**No spinners**: reads and writes hit local storage and are instant.',
        '**Your work is not trapped on one device**: it syncs across your devices.',
        '**The network is optional**: everything works offline.',
        '**Seamless collaboration** with others, in real time when online.',
        '**The long now**: data outlives the vendor and keeps working if the service shuts down.',
        '**Security and privacy by default**: servers need not see plaintext.',
        '**You retain ultimate ownership and control** of your data.'
      ),
      p(
        'CRDTs make 1–4 possible without a central authority. 5–7 are architecture decisions: open formats, local storage as the source of truth, and servers that relay and store rather than own.'
      )
    ),
    section(
      'layers',
      'The layers of a local-first app',
      compare(
        'Layers and typical choices',
        ['Layer', 'Responsibility', 'Examples'],
        ['Document model', 'CRDT types and merge rules', 'Yjs, Automerge, Loro'],
        ['Local persistence', 'Store updates/snapshots durably on device', 'IndexedDB, OPFS, SQLite (mobile/desktop), y-indexeddb, automerge-repo storage adapters'],
        ['Sync protocol', 'Find and exchange missing updates', 'Yjs sync step 1/2, Automerge sync protocol'],
        ['Transport', 'Move bytes between peers', 'WebSocket to a relay, WebRTC, BroadcastChannel between tabs'],
        ['Sync server (optional)', 'Relay, store, back up, authorize', 'y-websocket server, Hocuspocus, automerge-repo sync server, PartyKit-style rooms'],
        ['Presence', 'Ephemeral state: cursors, selections, who is online', 'y-protocols awareness, ephemeral messages'],
        ['App state', 'UI derived from the document', 'Subscribe to document change events']
      ),
      code(
        'ts',
        'client-setup.ts',
        `
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';

const doc = new Y.Doc();

// 1. Local persistence first: the app works before (and without) the network.
const local = new IndexeddbPersistence('doc-42', doc);
local.on('synced', () => render(doc));

// 2. Network sync to a relay server, room = document id.
const remote = new WebsocketProvider('wss://sync.example.com', 'doc-42', doc);

// 3. Presence lives beside the document, not inside it.
remote.awareness.setLocalStateField('user', { name: 'Alice', color: '#3EE6C1' });
remote.awareness.on('change', () => {
  const people = [...remote.awareness.getStates().values()].map((s) => s.user);
  renderPresence(people);
});

doc.on('update', () => render(doc));

declare function render(d: Y.Doc): void;
declare function renderPresence(users: unknown[]): void;
`
      ),
      flow({
        title: 'Opening a document in a local-first app',
        nodes: [
          { id: 'open', label: 'Open doc', sub: 'id doc-42', col: 0, row: 1, tone: 'plain' },
          { id: 'idb', label: 'IndexedDB', sub: 'load updates', col: 1, row: 0, tone: 'yellow' },
          { id: 'ui', label: 'Render', sub: 'instant, offline OK', col: 2, row: 0, tone: 'yellow' },
          { id: 'ws', label: 'Connect relay', sub: 'WebSocket', col: 1, row: 2, tone: 'purple' },
          { id: 'hs', label: 'Handshake', sub: 'state vectors', col: 2, row: 2, tone: 'purple' },
          { id: 'live', label: 'Live updates', sub: 'both directions', col: 3, row: 1, tone: 'red' },
          { id: 'save', label: 'Persist', sub: 'every update', col: 4, row: 1, tone: 'yellow' },
        ],
        edges: [
          { id: 'e1', from: 'open', to: 'idb' },
          { id: 'e2', from: 'idb', to: 'ui' },
          { id: 'e3', from: 'open', to: 'ws' },
          { id: 'e4', from: 'ws', to: 'hs' },
          { id: 'e5', from: 'hs', to: 'live' },
          { id: 'e6', from: 'ui', to: 'live' },
          { id: 'e7', from: 'live', to: 'save' },
        ],
        steps: [
          { title: 'Open by id', text: 'The app knows a document id. Nothing about opening it requires the network.', nodes: ['open'] },
          { title: 'Load from local storage', text: 'Stored updates (or a snapshot plus later updates) are read from IndexedDB and applied to an empty Y.Doc.', nodes: ['idb'], edges: ['e1'] },
          { title: 'Render immediately', text: 'The UI shows the last state this device knew. No spinner. The user can start editing.', nodes: ['ui'], edges: ['e2'] },
          { title: 'Connect in parallel', text: 'Meanwhile the provider opens a WebSocket to the relay for room doc-42. If it fails, the app keeps working and retries.', nodes: ['ws'], edges: ['e3'] },
          { title: 'Exchange what each side is missing', text: 'Sync step 1 sends a state vector; step 2 returns the missing updates. Offline edits made in the meantime are included.', nodes: ['hs'], edges: ['e4'] },
          { title: 'Steady state', text: 'Local edits are applied, persisted and broadcast; remote updates are applied, persisted and rendered. Local storage stays the source of truth.', nodes: ['live', 'save'], edges: ['e5', 'e6', 'e7'] },
        ],
      })
    ),
    section(
      'protocols',
      'Sync protocols',
      p(
        '**Yjs (y-protocols)** uses three message types over any transport: *SyncStep1* (my state vector), *SyncStep2* (the update you are missing, computed from your state vector) and *Update* (an incremental update after a local change). Each side sends SyncStep1 on connect and answers the other\'s SyncStep1 with SyncStep2. The exchange takes one round trip.'
      ),
      p(
        '**Automerge**\'s sync protocol works on its change DAG. Each peer keeps a small sync state per peer. Messages carry the sender\'s current **heads** (latest change hashes), the hashes it **needs**, and a **Bloom filter** summarizing the changes it has since the last heads both sides agreed on. The receiver sends any changes not in the filter. A few rounds may be needed when histories diverged widely; false positives in the filter are resolved by explicit need requests (approximate description; see the Automerge sync docs).'
      ),
      callout(
        'deep',
        'Why a Bloom filter',
        'Automerge history is a set of hashed changes without a compact per-replica counter like Yjs\'s state vector. Listing every hash would be large. A Bloom filter compresses "here is roughly what I have" into a few bytes per change, at the cost of occasional false positives that the protocol corrects.'
      ),
      check(
        'A Yjs client reconnects after a week offline. What does it send first?',
        ['Its entire document', 'Its state vector (SyncStep1)', 'A list of every item id it has', 'Nothing; it waits for the server'],
        1,
        'It sends its state vector. The server replies with SyncStep2 containing exactly the missing updates, and the client does the same for the server\'s state vector, so the offline edits travel too.'
      )
    ),
    section(
      'presence',
      'Presence is not document state',
      p(
        'Cursors, selections, "Alice is typing" and who is online change constantly and are worthless after the session. Storing them in the CRDT would bloat history forever. Libraries keep them in a separate **ephemeral** channel. Yjs\'s awareness protocol keeps a map clientID → JSON state with a per-client counter; peers rebroadcast periodically, and a client whose state hasn\'t been renewed for about 30 seconds is considered offline and removed.'
      ),
      callout(
        'rule',
        'Persist edits, broadcast presence',
        'If losing it on reload is fine, it is presence: send it over the ephemeral channel. If the user would be upset to lose it, it belongs in the document.'
      ),
      check(
        'Why does Yjs awareness use timeouts instead of an explicit "I left" message only?',
        ['Timeouts are cheaper to encode', 'Clients often disappear without saying goodbye (closed laptop, lost network)', 'CRDTs cannot represent removal', 'Awareness is stored on the server'],
        1,
        'A client that vanishes cannot send a leave message. Periodic renewal plus a timeout lets everyone else drop stale cursors.'
      )
    ),
    section(
      'servers',
      'Sync servers: relay, store, authorize',
      p(
        'Peer-to-peer sounds ideal, but browsers can\'t accept incoming connections, NAT traversal is unreliable, and two peers are rarely online at the same time. Most local-first products use a server anyway, with a narrower job than a traditional backend:'
      ),
      ul(
        '**Relay**: forward updates between connected clients in the same room.',
        '**Store**: keep the document so a client can sync when no other peer is online, and as a backup.',
        '**Authorize**: decide who may connect to a document and whether they may write.',
        '**Compact**: merge many small updates into one, and serve snapshots for fast first load.'
      ),
      code(
        'ts',
        'tiny-relay.ts',
        `
// A minimal persistent relay. Real deployments use y-websocket/Hocuspocus,
// which add the y-protocols framing, awareness and auth hooks.
import { WebSocketServer, type WebSocket } from 'ws';
import * as Y from 'yjs';

type Room = { doc: Y.Doc; peers: Set<WebSocket> };
const rooms = new Map<string, Room>();

const wss = new WebSocketServer({ port: 1234 });
wss.on('connection', async (ws, req) => {
  const roomId = new URL(req.url ?? '/', 'http://x').searchParams.get('doc');
  if (!roomId || !(await canAccess(req, roomId))) return ws.close(4003, 'forbidden');

  let room = rooms.get(roomId);
  if (!room) {
    room = { doc: await loadDoc(roomId), peers: new Set() };
    rooms.set(roomId, room);
  }
  room.peers.add(ws);

  // Send everything the server has; the client merges and replies with its own.
  ws.send(Y.encodeStateAsUpdate(room.doc));

  ws.on('message', (data: Buffer) => {
    const update = new Uint8Array(data);
    Y.applyUpdate(room!.doc, update); // idempotent: duplicates are no-ops
    void saveUpdate(roomId, update);
    for (const peer of room!.peers) if (peer !== ws) peer.send(update);
  });
  ws.on('close', () => room!.peers.delete(ws));
});

declare function canAccess(req: unknown, roomId: string): Promise<boolean>;
declare function loadDoc(roomId: string): Promise<Y.Doc>;
declare function saveUpdate(roomId: string, update: Uint8Array): Promise<void>;
`,
        'The client side of this toy protocol: on connect, apply the server\'s update, then send Y.encodeStateAsUpdate(doc) so offline edits reach the server; afterwards forward each local update.'
      ),
      flow({
        title: 'A relay server with storage and access control',
        nodes: [
          { id: 'c1', label: 'Client A', sub: 'token for doc-42', col: 0, row: 0, tone: 'yellow' },
          { id: 'c2', label: 'Client B', sub: 'read-only token', col: 0, row: 2, tone: 'purple' },
          { id: 'auth', label: 'Auth check', sub: 'room + role', col: 1, row: 1, tone: 'red' },
          { id: 'room', label: 'Room doc-42', sub: 'in-memory Y.Doc', col: 2, row: 1, tone: 'plain' },
          { id: 'db', label: 'Storage', sub: 'updates + snapshot', col: 3, row: 0, tone: 'plain' },
          { id: 'fan', label: 'Fan-out', sub: 'to other peers', col: 3, row: 2, tone: 'plain' },
          { id: 'cmp', label: 'Compaction', sub: 'merge updates', col: 4, row: 0, tone: 'plain' },
        ],
        edges: [
          { id: 'e1', from: 'c1', to: 'auth' },
          { id: 'e2', from: 'c2', to: 'auth' },
          { id: 'e3', from: 'auth', to: 'room' },
          { id: 'e4', from: 'room', to: 'db' },
          { id: 'e5', from: 'room', to: 'fan' },
          { id: 'e6', from: 'db', to: 'cmp' },
        ],
        steps: [
          { title: 'Clients present credentials', text: 'Each connection names a document and carries a token. Client B\'s token only grants read access.', nodes: ['c1', 'c2'] },
          { title: 'Authorize the connection', text: 'The server checks the token before joining the room. With CRDTs, access control is usually per document: who may read it, who may write to it.', nodes: ['auth'], edges: ['e1', 'e2'] },
          { title: 'Join the room', text: 'The room holds a live copy of the document. New clients receive what they are missing.', nodes: ['room'], edges: ['e3'] },
          { title: 'Enforce write permissions', text: 'Updates from a read-only connection are dropped instead of applied. This is the main enforcement point; a peer-to-peer system without a server has no such choke point.', nodes: ['auth', 'room'] },
          { title: 'Store and forward', text: 'Accepted updates are persisted and sent to every other peer in the room.', nodes: ['db', 'fan'], edges: ['e4', 'e5'] },
          { title: 'Compact', text: 'Periodically the server merges stored updates into one (Yjs: Y.mergeUpdates, or encode the whole doc). First loads then fetch one blob instead of thousands of tiny updates.', nodes: ['cmp'], edges: ['e6'] },
        ],
      })
    ),
    section(
      'permissions',
      'Permissions are the hard part',
      p(
        'A traditional backend validates every write: "only the owner may change the price". A relay that just merges CRDT updates can\'t easily do this, because an update is an opaque batch of low-level item insertions, and the write is already final on the client that made it. Options, from simplest to most ambitious:'
      ),
      ul(
        '**Per-document access**: split data into documents along permission boundaries (one doc per project, per user\'s private notes). Enforce read/write per doc at the server.',
        '**Validate by decoding**: the server applies the update to its copy, inspects the resulting change, and rejects updates that touch forbidden parts. Possible, but rejected updates leave the client diverged, and you must handle resync.',
        '**End-to-end encryption**: the server stores only ciphertext and cannot read or validate; clients share keys. Revoking access means rotating keys for future data; anything already synced stays readable to whoever had it.',
        '**Signed, capability-based updates**: each update is signed and carries a proof of authority that every replica can check (research: Ink & Switch\'s Keyhive). Enforcement then works without a trusted server.'
      ),
      callout(
        'warn',
        'You cannot un-share',
        'Once a replica has received data, it has it. Removing someone from a document stops future updates; it does not erase their local copy or history. Design sharing defaults and document boundaries with that in mind.'
      ),
      check(
        'Your app has a team document where only admins may edit the "billing" section. What is the most robust local-first design?',
        [
          'Keep billing in the same CRDT doc and trust clients',
          'Put billing in a separate document that only admins can write, enforced at the sync server',
          'Use LWW so admin edits win',
          'Encrypt the billing section with the team key',
        ],
        1,
        'Splitting along the permission boundary gives a clean enforcement point: the server rejects non-admin writes to that document entirely. Trusting clients or LWW enforces nothing, and a shared team key lets every member write.'
      )
    ),
    section(
      'storage-migration',
      'Storage, compaction and schema changes',
      p(
        'Typical local storage keeps a **snapshot** plus a log of **incremental updates** since the snapshot. Writes append (cheap, crash-safe); on load you apply the snapshot then the updates; occasionally you write a fresh snapshot and truncate the log. Automerge exposes this directly (`save` for a full compacted document, `saveIncremental` for the changes since the last save); y-indexeddb stores updates and periodically merges them.'
      ),
      p(
        'Schema changes are harder than in a server database, because old clients with old code may keep editing for months and their edits must still merge. Practical rules:'
      ),
      ul(
        '**Only add**: new optional fields, new keys. Never rename or repurpose a field; add a new one and read both.',
        '**Version the document** (a `schemaVersion` key) and let new code upgrade in place lazily, writing the new fields alongside the old.',
        '**Translate at the edges**: Ink & Switch\'s Cambria project explores bidirectional "lenses" that translate between schema versions so old and new clients can co-edit.',
        '**Gate breaking changes**: if you truly must break, refuse to sync with clients below a minimum version and ask them to update.'
      ),
      check(
        'You want to rename `title` to `name` in a shared document. Old clients are still in use. What is the safe approach?',
        [
          'Rename the key in a migration on the server',
          'Write both `title` and `name` from new clients, read `name` falling back to `title`, and keep doing so until old clients are gone',
          'Delete `title` and set `name` on first open',
          'Use LWW between the two keys',
        ],
        1,
        'Old clients still read and write `title`. Dual-writing and dual-reading keeps both generations working until you can retire the old field.'
      )
    ),
    section(
      'recap',
      'Recap',
      terms(
        ['Local-first', 'Local storage is the source of truth; network sync is an optimization and a collaboration channel.'],
        ['SyncStep1 / SyncStep2', 'Yjs handshake: send state vector; reply with the missing update.'],
        ['Awareness', 'Ephemeral presence state with timeouts, kept outside the document.'],
        ['Relay server', 'Routes, stores, compacts and authorizes, but does not decide merges.'],
        ['Permission boundary', 'Split documents so each has one access policy the server can enforce.'],
        ['Cambria lens', 'A bidirectional translation between schema versions.']
      ),
      h3('Next'),
      p('Module 8 asks the uncomfortable question: when should you not use CRDTs at all, and what do hybrid designs look like?')
    ),
  ],
};
