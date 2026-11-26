import type { AskSelection } from '../types';

interface AskChipProps {
  selection: AskSelection;
  onOpen: () => void;
}

const CHIP_OFFSET = 10;

export const AskChip = ({ selection, onOpen }: AskChipProps) => (
  <button
    type="button"
    className="ask-chip"
    style={{ top: `${Math.max(CHIP_OFFSET, selection.top - CHIP_OFFSET)}px`, left: `${selection.left}px` }}
    onPointerDown={(event) => {
      event.preventDefault();
      onOpen();
    }}
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.1 1-1.1 1.8v.4" />
      <path d="M12 17.4h.01" />
      <path d="M4 5.5h16v11H13l-4.5 3.5v-3.5H4z" />
    </svg>
    <span>Ask</span>
  </button>
);
