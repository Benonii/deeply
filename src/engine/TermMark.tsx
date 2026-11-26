import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import { Link } from '@farm.js/core/client';

import { useLesson } from './lesson';

const VIEWPORT_MARGIN = 12;

interface TermMarkProps {
  termId: string;
  display: string;
}

export const TermMark = ({ termId, display }: TermMarkProps) => {
  const lesson = useLesson();
  const popoverID = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [shiftLeft, setShiftLeft] = useState(0);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const term = lesson.terms.get(termId);

  useLayoutEffect(() => {
    if (!isOpen || !wrapperRef.current || !popoverRef.current) return;
    const anchor = wrapperRef.current.getBoundingClientRect();
    const overflowRight = anchor.left + popoverRef.current.offsetWidth - (window.innerWidth - VIEWPORT_MARGIN);
    setShiftLeft(overflowRight > 0 ? -Math.min(overflowRight, anchor.left - VIEWPORT_MARGIN) : 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [isOpen]);

  if (!term) return <>{display}</>;

  const hover = (next: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') setIsOpen(next);
  };

  return (
    <span className="term-ref" ref={wrapperRef} onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
      <button
        type="button"
        className="term-ref-word"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverID : undefined}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
      >
        {display}
      </button>
      {isOpen && (
        <span className="term-ref-pop" id={popoverID} ref={popoverRef} style={{ left: shiftLeft }}>
          <span className="term-ref-name">{term.term}</span>
          <span className="term-ref-def">{term.definition}</span>
          {term.moduleId !== lesson.moduleId && (
            <Link className="term-ref-back" href={`${lesson.basePath}/m/${term.moduleId}`}>
              Taught in module {term.moduleNumber}: {term.moduleTitle} →
            </Link>
          )}
        </span>
      )}
    </span>
  );
};
