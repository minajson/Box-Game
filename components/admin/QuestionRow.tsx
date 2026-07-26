"use client";

import { memo, useEffect, useRef, useState } from "react";

import type { ManagedPuzzle } from "@/lib/types";
import type { ValidationResult } from "@/lib/puzzleValidation";
import { fullTime, relativeTime, shortPreview, typeLabel } from "@/lib/puzzleSummary";
import { Badge, IconBtn, SrOnly } from "./ui";

/**
 * One question in the admin list.
 *
 * Layout is a CSS grid at `md+` that collapses to a card below it — the same
 * markup either way, so the drag handling and the action buttons do not need a
 * mobile duplicate. (A real `<table>` was rejected for exactly that reason:
 * draggable rows plus a card breakpoint means maintaining two DOM shapes.)
 *
 * `memo` matters here: a 500-question bank re-renders this row on every
 * keystroke in the search box otherwise.
 */

/**
 * Nine tracks for nine cells: grip · position · question · type · category ·
 * level · active · updated · actions.
 *
 * Keep this count in step with both the cells in `QuestionRow` and the heading
 * strip in `QuestionList` — one cell more than there are tracks and the extra
 * wraps onto an implicit second row, squeezed into the 2rem grip column.
 */
export const ROW_GRID =
  "md:grid md:grid-cols-[2rem_3.25rem_minmax(0,1fr)_8.5rem_7rem_5.5rem_4.5rem_6rem_auto] md:items-center md:gap-3";

export interface RowCallbacks {
  onEdit: (uid: string) => void;
  onDuplicate: (uid: string) => void;
  onDelete: (uid: string) => void;
  onPreview: (uid: string) => void;
  onToggleActive: (uid: string) => void;
  onMove: (uid: string, delta: -1 | 1) => void;
  onSetOrder: (uid: string, position: number) => void;
  /** Native drag: called with the dragged uid on drag start. */
  onDragStart: (uid: string) => void;
  onDragOver: (uid: string, edge: "before" | "after") => void;
  onDrop: () => void;
  onDragEnd: () => void;
  /** Registers the grip button so focus can be restored after a keyboard move. */
  registerGrip: (uid: string, el: HTMLButtonElement | null) => void;
}

function DifficultyPill({ value }: { value: ManagedPuzzle["difficulty"] }) {
  const tone = value === "easy" ? "green" : value === "hard" ? "red" : "amber";
  return <Badge tone={tone}>{value}</Badge>;
}

const QuestionRow = memo(function QuestionRow({
  puzzle,
  position,
  total,
  result,
  dragEnabled,
  dragging,
  dropEdge,
  cb,
}: {
  puzzle: ManagedPuzzle;
  /** 1-based position in the full bank order. */
  position: number;
  total: number;
  result?: ValidationResult;
  dragEnabled: boolean;
  dragging: boolean;
  /** Where the insertion line sits, when this row is the drop target. */
  dropEdge: "before" | "after" | null;
  cb: RowCallbacks;
}) {
  const errors = result?.errors.length ?? 0;
  const gripRef = useRef<HTMLButtonElement>(null);

  /**
   * The position box holds a DRAFT, because committing on every keystroke would
   * reorder the list mid-typing and pull focus out of the input. It is committed
   * on Enter or blur instead.
   *
   * When the row moves for some other reason (a drag, a neighbour's delete) the
   * draft has to catch up. Adjusting state during render — rather than in an
   * effect — is React's documented pattern for exactly this: it re-renders
   * before anything is painted, so there is no flash of the stale number and no
   * cascading-render warning.
   */
  const [orderDraft, setOrderDraft] = useState(String(position));
  const [syncedPosition, setSyncedPosition] = useState(position);
  if (syncedPosition !== position) {
    setSyncedPosition(position);
    setOrderDraft(String(position));
  }

  useEffect(() => {
    cb.registerGrip(puzzle.uid, gripRef.current);
    return () => cb.registerGrip(puzzle.uid, null);
  }, [cb, puzzle.uid]);

  const commitOrder = () => {
    const n = Number(orderDraft);
    if (!Number.isFinite(n) || n === position) {
      setOrderDraft(String(position));
      return;
    }
    cb.onSetOrder(puzzle.uid, Math.max(1, Math.min(total, Math.round(n))));
  };

  return (
    <li
      draggable={dragEnabled}
      onDragStart={(e) => {
        if (!dragEnabled) return;
        e.dataTransfer.setData("text/plain", puzzle.uid);
        e.dataTransfer.effectAllowed = "move";
        cb.onDragStart(puzzle.uid);
      }}
      onDragOver={(e) => {
        if (!dragEnabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const box = e.currentTarget.getBoundingClientRect();
        cb.onDragOver(puzzle.uid, e.clientY < box.top + box.height / 2 ? "before" : "after");
      }}
      onDrop={(e) => {
        if (!dragEnabled) return;
        e.preventDefault();
        cb.onDrop();
      }}
      onDragEnd={cb.onDragEnd}
      className={`relative border-b border-ink/8 px-3 py-3 transition-colors last:border-b-0 ${
        dragging ? "opacity-40" : "hover:bg-ink/[0.02]"
      } ${!puzzle.active ? "bg-ink/[0.015]" : ""} ${ROW_GRID}`}
    >
      {/* Drop indicator — absolutely positioned so it never shifts the row. */}
      {dropEdge && (
        <span
          aria-hidden
          className={`absolute left-2 right-2 h-[3px] rounded-full bg-ren-green ${
            dropEdge === "before" ? "-top-[2px]" : "-bottom-[2px]"
          }`}
        />
      )}

      {/* Grip — a real button, so reordering works without a mouse. */}
      <div className="absolute right-3 top-3 md:static md:right-auto md:top-auto">
        <button
          ref={gripRef}
          type="button"
          aria-disabled={!dragEnabled}
          aria-label={`Reorder ${puzzle.answer}. Position ${position} of ${total}. Use the up and down arrow keys to move it.`}
          title={
            dragEnabled
              ? "Drag to reorder, or use the arrow keys"
              : "Clear the filters and sort by question order to drag"
          }
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              cb.onMove(puzzle.uid, -1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              cb.onMove(puzzle.uid, 1);
            }
          }}
          className={`flex h-8 w-6 items-center justify-center rounded-lg text-ink-soft transition ${
            dragEnabled ? "cursor-grab hover:bg-ink/5 hover:text-ink" : "opacity-30"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>
      </div>

      {/* Order number + nudge buttons */}
      <div className="mt-2 flex items-center gap-1 md:mt-0">
        <SrOnly>Position</SrOnly>
        <input
          type="number"
          min={1}
          max={total}
          value={orderDraft}
          aria-label={`Position of ${puzzle.answer}`}
          onChange={(e) => setOrderDraft(e.target.value)}
          onBlur={commitOrder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitOrder();
            }
          }}
          className="w-12 rounded-lg border border-ink/15 bg-white px-1.5 py-1 text-center text-xs font-black text-ink"
        />
        <span className="flex flex-col md:hidden">
          <IconBtn
            label="Move up"
            disabled={position <= 1}
            onClick={() => cb.onMove(puzzle.uid, -1)}
            size="sm"
          >
            <Caret dir="up" />
          </IconBtn>
          <IconBtn
            label="Move down"
            disabled={position >= total}
            onClick={() => cb.onMove(puzzle.uid, 1)}
            size="sm"
          >
            <Caret dir="down" />
          </IconBtn>
        </span>
      </div>

      {/* Preview — the whole cell opens the editor. */}
      <div className="mt-2 min-w-0 md:mt-0">
        <button
          type="button"
          onClick={() => cb.onEdit(puzzle.uid)}
          className="block w-full min-w-0 text-left"
        >
          <span className="block truncate text-sm font-bold text-ink hover:underline">
            {shortPreview(puzzle)}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-soft">
            {puzzle.answer}
          </span>
        </button>
        {errors > 0 && (
          <button
            type="button"
            onClick={() => cb.onEdit(puzzle.uid)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-700 hover:bg-red-100"
          >
            ⚠ {errors} problem{errors === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <div className="mt-2 min-w-0 md:mt-0">
        <SrOnly>Type</SrOnly>
        <Badge tone="sky">{typeLabel(puzzle.type)}</Badge>
      </div>

      <div className="mt-2 min-w-0 md:mt-0">
        <SrOnly>Category</SrOnly>
        <span className="block truncate text-xs font-semibold text-ink-soft">
          {puzzle.category}
        </span>
      </div>

      <div className="mt-2 md:mt-0">
        <SrOnly>Difficulty</SrOnly>
        <DifficultyPill value={puzzle.difficulty} />
      </div>

      {/* Active switch */}
      <div className="mt-2 md:mt-0">
        <SrOnly>Active</SrOnly>
        <button
          type="button"
          role="switch"
          aria-checked={puzzle.active}
          aria-label={`${puzzle.active ? "Disable" : "Enable"} ${puzzle.answer}`}
          onClick={() => cb.onToggleActive(puzzle.uid)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            puzzle.active ? "bg-ren-green" : "bg-ink/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              puzzle.active ? "translate-x-[1.15rem]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-2 md:mt-0">
        <SrOnly>Last updated</SrOnly>
        <span
          className="block text-xs text-ink-soft"
          title={fullTime(puzzle.updatedAt)}
        >
          {relativeTime(puzzle.updatedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1 md:mt-0 md:justify-end">
        <IconBtn label={`Move up: ${puzzle.answer}`} disabled={position <= 1} onClick={() => cb.onMove(puzzle.uid, -1)} className="hidden md:inline-flex">
          <Caret dir="up" />
        </IconBtn>
        <IconBtn label={`Move down: ${puzzle.answer}`} disabled={position >= total} onClick={() => cb.onMove(puzzle.uid, 1)} className="hidden md:inline-flex">
          <Caret dir="down" />
        </IconBtn>
        <IconBtn label={`Preview: ${puzzle.answer}`} onClick={() => cb.onPreview(puzzle.uid)}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </IconBtn>
        <IconBtn label={`Edit: ${puzzle.answer}`} onClick={() => cb.onEdit(puzzle.uid)}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path d="M4 20h4L20 8l-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </IconBtn>
        <IconBtn label={`Duplicate: ${puzzle.answer}`} onClick={() => cb.onDuplicate(puzzle.uid)}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6.5A2.5 2.5 0 0 0 4 5.5v6A2.5 2.5 0 0 0 6.5 14" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </IconBtn>
        <IconBtn tone="danger" label={`Delete: ${puzzle.answer}`} onClick={() => cb.onDelete(puzzle.uid)}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path d="M5 7h14M10 7V4.5h4V7m-7 0 .8 12.5h8.4L17 7" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </IconBtn>
      </div>
    </li>
  );
},
// Re-render only when something visible to this row changed.
(a, b) =>
  a.puzzle === b.puzzle &&
  a.position === b.position &&
  a.total === b.total &&
  a.dragEnabled === b.dragEnabled &&
  a.dragging === b.dragging &&
  a.dropEdge === b.dropEdge &&
  (a.result?.errors.length ?? 0) === (b.result?.errors.length ?? 0) &&
  a.cb === b.cb);

function Caret({ dir }: { dir: "up" | "down" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d={dir === "up" ? "m6 14 6-6 6 6" : "m6 10 6 6 6-6"}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default QuestionRow;
