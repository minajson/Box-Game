"use client";

import type { ManagedPuzzle } from "@/lib/types";
import type { ValidationResult } from "@/lib/puzzleValidation";
import QuestionRow, { ROW_GRID, type RowCallbacks } from "./QuestionRow";
import { Btn, Callout } from "./ui";

/**
 * The question list, plus pagination.
 *
 * PAGINATION, NOT VIRTUAL SCROLLING. Virtualising would unmount rows that are
 * off-screen, which breaks two things this list depends on: a native drag needs
 * its drop target mounted, and the browser's own Ctrl-F needs the text present.
 * 500 rows is roughly 9k DOM nodes, which React 19 renders without help — and
 * the memoised row means a keystroke in the search box does not re-render them.
 */

export default function QuestionList({
  rows,
  positions,
  total,
  results,
  dragEnabled,
  dragUid,
  dropTarget,
  page,
  pageSize,
  pageCount,
  filtered,
  onPage,
  onPageSize,
  onClearFilters,
  cb,
}: {
  /** The current page, already filtered and sorted. */
  rows: ManagedPuzzle[];
  /** uid → 1-based position in the FULL bank order (not the page). */
  positions: Map<string, number>;
  total: number;
  results: Map<string, ValidationResult>;
  dragEnabled: boolean;
  dragUid: string | null;
  dropTarget: { uid: string; edge: "before" | "after" } | null;
  page: number;
  pageSize: number | "all";
  pageCount: number;
  /** How many questions match the filters, across all pages. */
  filtered: number;
  onPage: (n: number) => void;
  onPageSize: (n: number | "all") => void;
  onClearFilters: () => void;
  cb: RowCallbacks;
}) {
  if (total === 0) {
    return (
      <Callout tone="warn" title="There are no questions">
        Add one, import a CSV, or restore the bundled set.
      </Callout>
    );
  }

  if (rows.length === 0) {
    return (
      <Callout title="Nothing matches those filters">
        <button
          type="button"
          onClick={onClearFilters}
          className="font-bold text-ink underline"
        >
          Clear all filters
        </button>{" "}
        to see all {total} questions.
      </Callout>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-panel">
      {/* Column headings. role=presentation because the real semantics live on
          the <ul>/<li> — this strip is a visual label row, not a table header. */}
      <div
        role="presentation"
        className={`hidden border-b border-ink/10 bg-ink/[0.025] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-ink-soft ${ROW_GRID}`}
      >
        {/* Nine cells, matching ROW_GRID's nine tracks. */}
        <span />
        <span>#</span>
        <span>Question</span>
        <span>Type</span>
        <span>Category</span>
        <span>Level</span>
        <span>Active</span>
        <span>Updated</span>
        <span className="text-right">Actions</span>
      </div>

      <ul role="list">
        {rows.map((p) => (
          <QuestionRow
            key={p.uid}
            puzzle={p}
            position={positions.get(p.uid) ?? 1}
            total={total}
            result={results.get(p.uid)}
            dragEnabled={dragEnabled}
            dragging={dragUid === p.uid}
            dropEdge={dropTarget?.uid === p.uid ? dropTarget.edge : null}
            cb={cb}
          />
        ))}
      </ul>

      {/* Footer: page size always, page controls only when they do something. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 bg-ink/[0.02] px-3 py-2.5">
        <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
          Per page
          <select
            value={String(pageSize)}
            onChange={(e) =>
              onPageSize(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs font-bold text-ink"
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </label>

        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <Btn size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              ← Previous
            </Btn>
            <span aria-live="polite" className="text-xs font-bold text-ink-soft">
              Page {page} of {pageCount}
            </span>
            <Btn size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
              Next →
            </Btn>
          </div>
        ) : (
          <span className="text-xs font-bold text-ink-soft">
            {filtered} shown
          </span>
        )}
      </div>

      {!dragEnabled && (
        <p className="border-t border-ink/8 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
          Drag-to-reorder is off while the list is filtered, searched, sorted by
          date or split across pages — dropping a row would have no clear
          position. The ↑↓ buttons and the position box still work.
        </p>
      )}
    </div>
  );
}
