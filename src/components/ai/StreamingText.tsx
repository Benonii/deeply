import { Markdown } from '../../engine/md';
import { useWordReveal } from '../../lib/hooks';
import './ai.css';

interface StreamingTextProps {
  text: string;
}

export const StreamingText = ({ text }: StreamingTextProps) => {
  const { visibleText, isRevealing } = useWordReveal(text);
  return (
    <div className={`ai-stream${isRevealing ? ' is-revealing' : ''}`}>
      <Markdown text={visibleText} />
    </div>
  );
};
