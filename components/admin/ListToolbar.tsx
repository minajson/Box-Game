"use client";

import { PUZZLE_DIFFICULTIES, PUZZLE_TYPES, type PuzzleDifficulty, type PuzzleType } from "@/lib/types";
import { TYPE_LABELS } from "@/lib/puzzleValidation";
import { EVENTS, EVENT_IDS, type EventId } from "@/data/events";
import { Btn, Chip, InlineSelect, Segmented } from "./ui";

/**
 * Search, filters, sort and the bank-level actions.
 *
 * The count line is the answer to "how many questions do I have?" and is
 * deliberately always visible — the facilitator needs it to choose a session
 * length, and it is the only place the active/total split is stated.
 */

export interface ListFilters {
  type: PuzzleType | "all";
  category: string | "all";
  difficulty: PuzzleDifficulty | "all";
  /** Show All / Active Only / Hidden Only. ("inactive" is the stored name for Hidden.) */
  active: "all" | "active" | "inactive";
  /** Which event a question belongs to (membership — whether or not it is Active now). */
  event: EventId | "all";
  problems: boolean;
}

export const EMPTY_FILTERS: ListFilters = {
  type: "all",
  category: "all",
  difficulty: "all",
  active: "all",
  event: "all",
  problems: false,
};

export function filtersActive(f: ListFilters, query: string): boolean {
  return (
    query.trim() !== "" ||
    f.type !== "all" ||
    f.category !== "all" ||
    f.difficulty !== "all" ||
    f.active !== "all" ||
    f.event !== "all" ||
    f.problems
  );
}

export type SortKey = "order" | "updated";

export default function ListToolbar({
  query,
  onQuery,
  filters,
  onFilters,
  sort,
  onSort,
  categories,
  total,
  activeCount,
  shown,
  problemTotal,
  onAdd,
  onImportExport,
  onRestoreDefaults,
  restoreDisabled,
}: {
  query: string;
  onQuery: (v: string) => void;
  filters: ListFilters;
  onFilters: (patch: Partial<ListFilters>) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  categories: string[];
  total: number;
  activeCount: number;
  shown: number;
  problemTotal: number;
  onAdd: () => void;
  onImportExport: () => void;
  onRestoreDefaults: () => void;
  restoreDisabled: boolean;
}) {
  const dirty = filtersActive(filters, query);

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 — search + primary actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <label htmlFor="q-search" className="sr-only">
            Search questions
          </label>
          <input
            id="q-search"
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search answers, clues, hints, categories…"
            className="w-full rounded-xl border border-ink/15 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-soft/60"
          />
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            fill="none"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <Btn tone="primary" onClick={onAdd}>
          + Add question
        </Btn>
        <Btn onClick={onImportExport}>Import / export</Btn>
        <Btn
          tone="danger"
          onClick={onRestoreDefaults}
          disabled={restoreDisabled}
          title={
            restoreDisabled
              ? "Already using the bundled questions."
              : "Discard every admin change in this browser and go back to the bundled NAPE 2026 game."
          }
        >
          Restore defaults
        </Btn>
      </div>

      {/* Row 2 — filters + sort */}
      <div className="flex flex-wrap items-end gap-2.5">
        <InlineSelect
          label="Type"
          value={filters.type}
          onChange={(v) => onFilters({ type: v as ListFilters["type"] })}
        >
          <option value="all">All types</option>
          {PUZZLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </InlineSelect>

        <InlineSelect
          label="Category"
          value={filters.category}
          onChange={(v) => onFilters({ category: v })}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </InlineSelect>

        <InlineSelect
          label="Difficulty"
          value={filters.difficulty}
          onChange={(v) => onFilters({ difficulty: v as ListFilters["difficulty"] })}
        >
          <option value="all">Any difficulty</option>
          {PUZZLE_DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </option>
          ))}
        </InlineSelect>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-soft">
            Show
          </span>
          <Segmented<ListFilters["active"]>
            label="Show questions by status"
            value={filters.active}
            onChange={(v) => onFilters({ active: v })}
            options={[
              { value: "all", label: "Show All" },
              { value: "active", label: "Active Only" },
              { value: "inactive", label: "Hidden Only" },
            ]}
          />
        </div>

        <InlineSelect
          label="Event"
          value={filters.event}
          onChange={(v) => onFilters({ event: v as ListFilters["event"] })}
        >
          <option value="all">All events</option>
          {EVENT_IDS.map((id) => (
            <option key={id} value={id}>
              {EVENTS[id].name}
            </option>
          ))}
        </InlineSelect>

        <InlineSelect label="Sort by" value={sort} onChange={(v) => onSort(v as SortKey)}>
          <option value="order">Question order</option>
          <option value="updated">Recently updated</option>
        </InlineSelect>

        <label className="flex cursor-pointer items-center gap-2 pb-1.5 text-xs font-bold text-ink">
          <input
            type="checkbox"
            checked={filters.problems}
            onChange={(e) => onFilters({ problems: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-ren-green)]"
          />
          Only problems
          {problemTotal > 0 && (
            <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-black text-red-700">
              {problemTotal}
            </span>
          )}
        </label>
      </div>

      {/* Row 3 — active filter chips + counts */}
      <div className="flex flex-wrap items-center gap-2 border-t border-ink/8 pt-3">
        <p className="text-xs font-bold text-ink-soft">
          <span className="text-ink">{total}</span> question{total === 1 ? "" : "s"}
          {" · "}
          <span className="text-ink">{activeCount}</span> active
          {" · "}
          <span className="text-ink">{total - activeCount}</span> hidden
          {dirty && (
            <>
              {" · "}
              showing <span className="text-ink">{shown}</span>
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {query.trim() && <Chip onRemove={() => onQuery("")}>{`“${query.trim()}”`}</Chip>}
          {filters.type !== "all" && (
            <Chip onRemove={() => onFilters({ type: "all" })}>
              {TYPE_LABELS[filters.type]}
            </Chip>
          )}
          {filters.category !== "all" && (
            <Chip onRemove={() => onFilters({ category: "all" })}>{filters.category}</Chip>
          )}
          {filters.difficulty !== "all" && (
            <Chip onRemove={() => onFilters({ difficulty: "all" })}>
              {filters.difficulty}
            </Chip>
          )}
          {filters.active !== "all" && (
            <Chip onRemove={() => onFilters({ active: "all" })}>
              {filters.active === "active" ? "active only" : "hidden only"}
            </Chip>
          )}
          {filters.event !== "all" && (
            <Chip onRemove={() => onFilters({ event: "all" })}>{EVENTS[filters.event].name}</Chip>
          )}
          {filters.problems && (
            <Chip onRemove={() => onFilters({ problems: false })}>with problems</Chip>
          )}
          {dirty && (
            <button
              type="button"
              onClick={() => {
                onQuery("");
                onFilters(EMPTY_FILTERS);
              }}
              className="rounded-full px-2 py-1 text-xs font-bold text-ink-soft underline hover:text-ink"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
