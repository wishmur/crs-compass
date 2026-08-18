interface TablePaginationProps {
  currentPage: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/** Shared numeric pagination control used by the history and score tables. */
export function TablePagination({ currentPage, pageCount, onChange }: TablePaginationProps) {
  if (pageCount <= 1) return null;

  const items: (number | "…")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - currentPage) <= 1) items.push(p);
    else if (items[items.length - 1] !== "…") items.push("…");
  }

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        ← Prev
      </button>
      {items.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={
              p === currentPage
                ? "num rounded-full bg-[var(--brand)] px-3 py-1.5 text-white"
                : "num rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
            }
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(pageCount, currentPage + 1))}
        disabled={currentPage === pageCount}
        className="px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        Next →
      </button>
    </nav>
  );
}
