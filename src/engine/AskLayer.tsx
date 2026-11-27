import { useState } from 'react';

import { useProseSelection } from './ask';
import { AskChip } from './AskChip';
import { AskPanel } from './AskPanel';
import { useLesson } from './lesson';

import type { RefObject } from 'react';
import type { AskSelection } from '../types';

interface AskLayerProps {
  proseRef: RefObject<HTMLElement | null>;
  onSignIn: () => void;
}

export const AskLayer = ({ proseRef, onSignIn }: AskLayerProps) => {
  const { concepts } = useLesson();
  const selection = useProseSelection(proseRef);
  const [target, setTarget] = useState<AskSelection | null>(null);
  if (concepts.length === 0) return null;
  return (
    <>
      {selection && !target && <AskChip selection={selection} onOpen={() => setTarget(selection)} />}
      {target && <AskPanel selection={target} onClose={() => setTarget(null)} onSignIn={onSignIn} />}
    </>
  );
};
