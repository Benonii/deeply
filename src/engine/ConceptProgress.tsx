import { readConceptStatus } from './lessonIndex';
import { useLesson } from './lesson';

const stateLabel = { passed: 'passed', attempted: 'retry', untouched: '' } as const;

export const ConceptProgress = () => {
  const { concepts, masteryByConcept } = useLesson();
  if (!concepts.length) return null;
  const statuses = concepts.map((concept) => ({
    ...concept,
    status: readConceptStatus(masteryByConcept.get(concept.conceptId))
  }));
  const passed = statuses.filter((concept) => concept.status === 'passed').length;
  return (
    <div className="side-concepts">
      <div className="nav-label">
        Concepts <span className="side-concepts-count">{`${passed}/${concepts.length} passed`}</span>
      </div>
      <ul>
        {statuses.map((concept) => (
          <li key={concept.conceptId} className={`concept ${concept.status}`}>
            <span className="concept-dot" aria-hidden />
            <span className="concept-name">{concept.name}</span>
            <span className="concept-state">{stateLabel[concept.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
