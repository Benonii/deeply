const CELLS = Array.from({ length: 9 }, (_, cellIndex) => {
  const row = Math.floor(cellIndex / 3);
  const column = cellIndex % 3;
  return { cellID: `cell-${cellIndex}`, delay: (column + Math.abs(row - 1)) * 90 };
});

export const LoaderGrid = () => (
  <span className="ai-grid" aria-hidden="true">
    {CELLS.map(({ cellID, delay }) => (
      <span key={cellID} style={{ animationDelay: `${delay}ms` }} />
    ))}
  </span>
);
