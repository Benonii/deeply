import type { CoursePack } from '../../../convex/lib/courseSchema';
import { crdtsBrand, crdtsChallenges } from './meta';
import { m01 } from './m01-why-sync';
import { m02 } from './m02-time-causality';
import { m03 } from './m03-state-based';
import { m04 } from './m04-op-based';
import { m05 } from './m05-sequences';
import { m06 } from './m06-documents';
import { m07 } from './m07-local-first';
import { m08 } from './m08-patterns';

export const crdtsPack: CoursePack = {
  id: 'crdts',
  title: 'CRDTs, Deeply',
  tagline: 'How replicas that never coordinate still end up agreeing.',
  summary:
    'Conflict-free replicated data types and local-first sync from first principles: causality and logical clocks, state- and op-based CRDTs, text algorithms like RGA, YATA and Fugue, how Automerge and Yjs work inside, local-first architecture, and the invariants CRDTs cannot protect.',
  kind: 'concept',
  brand: crdtsBrand,
  challenges: crdtsChallenges,
  modules: [m01, m02, m03, m04, m05, m06, m07, m08]
};
