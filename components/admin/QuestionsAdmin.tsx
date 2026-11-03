"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import {
  applyOrder,
  createPuzzle,
  deletePuzzle,
  duplicatePuzzle,
  loadBank,
  movePuzzle,
  resetBank,
  saveBank,
  setOrder,
  toggleActive,
  updatePuzzle,
  useBank,
  blankPuzzle,
  categoriesIn,
  SEED_BANK,
  hasCustomBank,
  dismissLegacyBankNotice,
  legacyBankJson,
  legacyBankNoticePending,
} from "@/lib/puzzleStore";
import { dateStamp, downloadText } from "@/lib/download";
import { KNOWN_ASSETS } from "@/lib/media";
import { loadSettings, loadState } from "@/lib/storage";
import { searchBlob, shortPreview } from "@/lib/puzzleSummary";
import { validateBank, validatePuzzle, type ValidationResult } from "@/lib/puzzleValidation";
import { ADMIN_AUTH_ENABLED, lock } from "@/lib/adminAuth";
import { useAdminRoute } from "@/lib/useAdminRoute";
import type { ManagedPuzzle } from "@/lib/types";

import ConfirmDialog from "./ConfirmDialog";
import ImportExportPanel from "./ImportExportPanel";
import ListToolbar, {
  EMPTY_FILTERS,
  filtersActive,
  type ListFilters,
  type SortKey,
} from "./ListToolbar";
import PreviewStage from "./PreviewStage";
import QuestionEditor from "./QuestionEditor";
import QuestionList from "./QuestionList";
import type { RowCallbacks } from "./QuestionRow";
import { Btn, Callout } from "./ui";

/**
 * The question admin. Owns every piece of state and is the ONLY caller of
 * `saveBank` — see `commit` below for why that single funnel matters.
 *
 * WHERE QUESTIONS ARE STORED
 * --------------------------
 * localStorage, key `crackthebox.puzzles.v2`, in THIS browser. There is no
 * server (static export), so that is the only durable store available. The
 * bundled 50 in `data/puzzles.ts` are the seed and the fallback. Moving a bank
 * to another machine means exporting CSV or JSON — see ImportExportPanel.
 */

type Pending =
  | { kind: "delete"; uid: string }
  | { kind: "restore" }
  | { kind: "discard"; then: () => void };

const AUTO_DISMISS_MS = 4000;

/* --------------------------------------------- the game's session, as a store */

/**
 * The saved game session is an external store (localStorage, written by the
 * game tab). Subscribing to `storage` means the "session in progress" banner
 * tracks the other tab live instead of going stale.
 */
function subscribeToGameState(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getOpenedBoxCount(): number {
  return loadState()?.openedBoxes.length ?? 0;
}

export default function QuestionsAdmin() {
  const bank = useBank();
  const { route, go } = useAdminRoute();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("order");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(25);

  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [previewUid, setPreviewUid] = useState<string | null>(null);
  const [legacyNotice, setLegacyNotice] = useState(legacyBankNoticePending);

  /** The in-progress add/edit form. Null when not editing. */
  const [draft, setDraft] = useState<ManagedPuzzle | null>(null);
  const [dirty, setDirty] = useState(false);

  const [dragUid, setDragUid] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ uid: string; edge: "before" | "after" } | null>(null);

  /** Grip buttons by uid, so focus survives a keyboard reorder. */
  const grips = useRef(new Map<string, HTMLButtonElement>());
  const refocusUid = useRef<string | null>(null);

  /* ------------------------------------------------------------ debounce -- */
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ------------------------------------------------------------- session -- */
  /**
   * How many boxes the game has open right now.
   *
   * The game clears a saved session whose question set changed (`restoreSession`
   * in app/page.tsx), so editing mid-game wipes the score — the admin should be
   * told BEFORE they save, not after. Read through `useSyncExternalStore` rather
   * than an effect: it is genuinely an external store, it gives the right
   * server/hydration split for free, and the `storage` subscription means the
   * banner updates live as the facilitator plays in the other tab.
   */
  const liveSession = useSyncExternalStore(
    subscribeToGameState,
    getOpenedBoxCount,
    () => 0,
  );

  /* ---------------------------------------------------------- validation -- */
  const results = useMemo(() => validateBank(bank, KNOWN_ASSETS), [bank]);
  const problemTotal = useMemo(() => {
    let n = 0;
    results.forEach((r) => {
      if (!r.ok) n++;
    });
    return n;
  }, [results]);

  const activeCount = useMemo(() => bank.filter((p) => p.active).length, [bank]);
  const categories = useMemo(() => categoriesIn(bank), [bank]);

  /** uid → 1-based position in the true bank order. */
  const positions = useMemo(() => {
    const m = new Map<string, number>();
    [...bank]
      .sort((a, b) => a.order - b.order)
      .forEach((p, i) => m.set(p.uid, i + 1));
    return m;
  }, [bank]);

  /* --------------------------------------------------------------- commit -- */
  /**
   * The single write path.
   *
   * Two things it protects against, both real:
   *
   * 1. A question that would CRASH the projected game (PuzzleCanvas reads
   *    `answer` and `imageAssets[0]` unguarded). We refuse to save a bank that
   *    newly breaks an ACTIVE question — "newly" so an already-broken question
   *    can still be deleted or deactivated, and "active" because an inactive
   *    question never reaches the canvas. That deactivate-then-fix route is the
   *    escape hatch.
   *
   * 2. `saveBank` silently DROPS entries that collide on uid or id and still
   *    returns `{ok: true}`. So we re-read afterwards and compare the count.
   */
  const commit = useCallback(
    (next: ManagedPuzzle[], successText: string): boolean => {
      const unsafe = (list: ManagedPuzzle[]) => {
        const out = new Set<string>();
        for (const p of list) {
          if (!p.active) continue;
          if (!validatePuzzle(p, { bank: list, ignoreUid: p.uid, knownAssets: KNOWN_ASSETS }).renderable) {
            out.add(p.uid);
          }
        }
        return out;
      };

      const before = unsafe(loadBank());
      const newlyBroken = [...unsafe(next)].filter((uid) => !before.has(uid));
      if (newlyBroken.length > 0) {
        setToast({
          tone: "error",
          text: `Not saved: ${newlyBroken.length} active question${
            newlyBroken.length === 1 ? "" : "s"
          } would break the game. Fix or deactivate ${
            newlyBroken.length === 1 ? "it" : "them"
          } first.`,
        });
        return false;
      }

      const result = saveBank(next);
      if (!result.ok) {
        setToast({ tone: "error", text: result.error ?? "Could not save." });
        return false;
      }

      const stored = loadBank();
      if (stored.length < next.length) {
        const lost = next.length - stored.length;
        setToast({
          tone: "error",
          text: `${lost} question${lost === 1 ? " was" : "s were"} dropped as duplicates. Export a backup and check for repeated questions.`,
        });
        return true;
      }

      setToast({ tone: "success", text: successText });
      return true;
    },
    [],
  );

  /* -------------------------------------------------------------- filter -- */
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const list = bank.filter((p) => {
      if (filters.type !== "all" && p.type !== filters.type) return false;
      if (filters.category !== "all" && p.category !== filters.category) return false;
      if (filters.difficulty !== "all" && p.difficulty !== filters.difficulty) return false;
      if (filters.active === "active" && !p.active) return false;
      if (filters.active === "inactive" && p.active) return false;
      if (filters.problems && (results.get(p.uid)?.ok ?? true)) return false;
      if (q && !searchBlob(p).includes(q)) return false;
      return true;
    });

    return list.sort((a, b) =>
      sort === "updated" ? b.updatedAt - a.updatedAt : a.order - b.order,
    );
  }, [bank, filters, debouncedQuery, sort, results]);

  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamped on READ rather than corrected in an effect: a filter that shrinks
  // the result set can strand `page` past the end, and deriving the safe value
  // means there is never a render showing an empty page.
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () =>
      pageSize === "all"
        ? filtered
        : filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  /**
   * Dragging is only meaningful when the visible order IS the bank order.
   * Otherwise "between rows 3 and 4" has no defensible mapping.
   */
  const dragEnabled =
    sort === "order" &&
    !filtersActive(filters, debouncedQuery) &&
    pageCount === 1;

  /* ------------------------------------------------------------ mutations -- */
  const byUid = useCallback(
    (uid: string) => bank.find((p) => p.uid === uid),
    [bank],
  );

  const handleToggleActive = useCallback(
    (uid: string) => {
      const p = byUid(uid);
      if (!p) return;
      commit(toggleActive(bank, uid), `“${p.answer}” is now ${p.active ? "inactive" : "active"}.`);
    },
    [bank, byUid, commit],
  );

  const handleDuplicate = useCallback(
    (uid: string) => {
      const { bank: next, created } = duplicatePuzzle(bank, uid);
      if (!created) return;
      // The copy is created INACTIVE with a suffixed answer, so it cannot clash
      // with the original or sneak onto the wall before it has been edited.
      if (commit(next, "Question duplicated. The copy is inactive until you edit it.")) {
        go({ view: "edit", uid: created.uid });
      }
    },
    [bank, commit, go],
  );

  const handleMove = useCallback(
    (uid: string, delta: -1 | 1) => {
      const next = movePuzzle(bank, uid, delta);
      if (next === bank) return; // Already at the end.
      refocusUid.current = uid;
      const to = (positions.get(uid) ?? 1) + delta;
      commit(next, `Moved to position ${to} of ${bank.length}.`);
    },
    [bank, commit, positions],
  );

  const handleSetOrder = useCallback(
    (uid: string, position: number) => {
      const next = setOrder(bank, uid, position);
      if (next === bank) return;
      commit(next, `Moved to position ${position} of ${bank.length}.`);
    },
    [bank, commit],
  );

  // Restore focus to the grip that was just used, after the list re-renders.
  useEffect(() => {
    const uid = refocusUid.current;
    if (!uid) return;
    refocusUid.current = null;
    grips.current.get(uid)?.focus();
  }, [bank]);

  const handleDrop = useCallback(() => {
    const from = dragUid;
    const target = dropTarget;
    setDragUid(null);
    setDropTarget(null);
    if (!from || !target || from === target.uid) return;

    const ordered = [...bank].sort((a, b) => a.order - b.order);
    const moving = ordered.find((p) => p.uid === from);
    if (!moving) return;

    const without = ordered.filter((p) => p.uid !== from);
    const at = without.findIndex((p) => p.uid === target.uid);
    if (at === -1) return;

    without.splice(target.edge === "before" ? at : at + 1, 0, moving);
    commit(applyOrder(without), `Moved “${moving.answer}” to position ${without.indexOf(moving) + 1}.`);
  }, [bank, dragUid, dropTarget, commit]);

  const confirmDelete = useCallback(() => {
    if (pending?.kind !== "delete") return;
    const p = byUid(pending.uid);
    setPending(null);
    if (!p) return;
    // Box numbers are DERIVED from the remaining active questions, so removing
    // one renumbers the wall rather than leaving a dead box behind.
    commit(deletePuzzle(bank, pending.uid), `Deleted “${p.answer}”.`);
    if (route.view === "edit" && route.uid === pending.uid) go({ view: "list" });
  }, [pending, bank, byUid, commit, route, go]);

  const confirmRestore = useCallback(() => {
    setPending(null);
    // resetBank() removes the key so the bundled seed loads. Never reset-then-
    // save: a failed second write would leave the admin with nothing.
    resetBank();
    setToast({ tone: "success", text: `Restored the ${SEED_BANK.length} bundled questions.` });
  }, []);

  /* -------------------------------------------------------------- editing -- */
  const openNew = useCallback(() => {
    setDraft(blankPuzzle(bank));
    setDirty(false);
    go({ view: "new" });
  }, [bank, go]);

  const openEdit = useCallback(
    (uid: string) => {
      const p = byUid(uid);
      if (!p) return;
      setDraft(structuredClone(p));
      setDirty(false);
      go({ view: "edit", uid });
    },
    [byUid, go],
  );

  /**
   * Keep the draft in step with the URL, so a bookmarked `?v=edit&uid=…` loads
   * the right question and the Back button leaves the editor.
   *
   * Adjusted during render rather than in an effect. The URL is the input and the
   * draft is derived from it, so an effect would paint one frame of the previous
   * question before correcting itself — visible as a flicker of the wrong answer
   * in the editor's heading.
   */
  const routeKey = `${route.view}:${route.uid ?? ""}`;
  // Starts as null, which no real route key can equal, so the sync always runs
  // once on mount. Seeding it with `routeKey` instead would skip the first pass
  // and leave a direct hit on `?v=new` with no draft at all.
  const [syncedRoute, setSyncedRoute] = useState<string | null>(null);
  if (syncedRoute !== routeKey) {
    setSyncedRoute(routeKey);
    if (route.view === "edit") {
      const p = bank.find((x) => x.uid === route.uid);
      // A uid that is not in the bank renders a "not found" panel below rather
      // than navigating from inside render.
      setDraft(p ? structuredClone(p) : null);
      setDirty(false);
    } else if (route.view === "new") {
      setDraft(blankPuzzle(bank));
      setDirty(false);
    } else {
      setDraft(null);
      setDirty(false);
    }
  }

  const patchDraft = useCallback((patch: Partial<ManagedPuzzle>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }, []);

  const draftResult: ValidationResult | null = useMemo(() => {
    if (!draft) return null;
    return validatePuzzle(draft, {
      bank,
      ignoreUid: route.view === "edit" ? draft.uid : undefined,
      knownAssets: KNOWN_ASSETS,
    });
  }, [draft, bank, route.view]);

  const saveDraft = useCallback(() => {
    if (!draft || !draftResult?.ok) return;

    if (route.view === "new") {
      // createPuzzle forces order = bank.length, so an explicit position has to
      // be applied as a second step.
      let next = createPuzzle(bank, draft);
      const wanted = draft.order + 1;
      if (wanted >= 1 && wanted <= next.length) {
        const created = next[next.length - 1];
        next = setOrder(next, created.uid, wanted);
      }
      if (commit(next, "Question added successfully.")) {
        setDirty(false);
        go({ view: "list" });
      }
      return;
    }

    let next = updatePuzzle(bank, draft);
    const wanted = draft.order + 1;
    if (wanted >= 1 && wanted <= next.length) next = setOrder(next, draft.uid, wanted);
    if (commit(next, "Question updated successfully.")) {
      setDirty(false);
      go({ view: "list" });
    }
  }, [draft, draftResult, bank, route.view, commit, go]);

  const cancelDraft = useCallback(() => {
    const leave = () => {
      setDirty(false);
      setDraft(null);
      go({ view: "list" });
    };
    if (dirty) setPending({ kind: "discard", then: leave });
    else leave();
  }, [dirty, go]);

  /* --------------------------------------------------------------- rowcb -- */
  const cb: RowCallbacks = useMemo(
    () => ({
      onEdit: openEdit,
      onDuplicate: handleDuplicate,
      onDelete: (uid) => setPending({ kind: "delete", uid }),
      onPreview: setPreviewUid,
      onToggleActive: handleToggleActive,
      onMove: handleMove,
      onSetOrder: handleSetOrder,
      onDragStart: setDragUid,
      onDragOver: (uid, edge) =>
        setDropTarget((prev) =>
          prev?.uid === uid && prev.edge === edge ? prev : { uid, edge },
        ),
      onDrop: handleDrop,
      onDragEnd: () => {
        setDragUid(null);
        setDropTarget(null);
      },
      registerGrip: (uid, el) => {
        if (el) grips.current.set(uid, el);
        else grips.current.delete(uid);
      },
    }),
    [openEdit, handleDuplicate, handleToggleActive, handleMove, handleSetOrder, handleDrop],
  );

  const previewPuzzle = previewUid ? byUid(previewUid) : undefined;
  const sessionLength = loadSettings().questionsPerSession;

  /* ---------------------------------------------------------------- views -- */
  if (route.view === "edit" || route.view === "new") {
    // An `?v=edit&uid=…` for a question that has since been deleted, or a stale
    // bookmark. Say so instead of silently redirecting.
    if (!draft || !draftResult) {
      return (
        <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-4 p-6">
          <Callout tone="warn" title="That question is no longer here">
            It may have been deleted, or this link may be from a different
            browser — questions are stored per browser.
          </Callout>
          <Btn tone="primary" onClick={() => go({ view: "list" }, { replace: true })}>
            Back to all questions
          </Btn>
        </main>
      );
    }
    return (
      <>
        <QuestionEditor
          draft={draft}
          isNew={route.view === "new"}
          total={bank.length}
          result={draftResult}
          categories={categories}
          dirty={dirty}
          liveSession={liveSession}
          onChange={patchDraft}
          onSave={saveDraft}
          onCancel={cancelDraft}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <ConfirmDialog
          open={pending?.kind === "discard"}
          title="Discard unsaved changes?"
          body="This question has edits that have not been saved."
          confirmLabel="Discard changes"
          onConfirm={() => {
            const then = pending?.kind === "discard" ? pending.then : null;
            setPending(null);
            then?.();
          }}
          onCancel={() => setPending(null)}
        />
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col gap-4 p-4 sm:p-6">
      <Header
        total={bank.length}
        activeCount={activeCount}
        sessionLength={sessionLength}
      />

      {liveSession > 0 && (
        <Callout tone="warn" title="A game session is in progress">
          {liveSession} box{liveSession === 1 ? " has" : "es have"} been opened.
          Saving a question change resets that session and clears the score —
          finish or reset the game first if that matters.
        </Callout>
      )}

      {legacyNotice && (
        <Callout tone="warn" title="Older saved questions were set aside">
          This browser had questions saved before the Myth or Fact update. They
          are no longer in play, so the updated questions show correctly, but
          they have not been deleted. To use them again, download them here and
          load the file with Import / export.
          <span className="mt-2 flex flex-wrap gap-2">
            <Btn
              size="sm"
              onClick={() =>
                downloadText(
                  `crack-the-box-older-saved-questions-${dateStamp()}.json`,
                  legacyBankJson() ?? "[]",
                  "application/json;charset=utf-8",
                )
              }
            >
              Download older questions
            </Btn>
            <Btn
              size="sm"
              onClick={() => {
                dismissLegacyBankNotice();
                setLegacyNotice(false);
              }}
            >
              Dismiss
            </Btn>
          </span>
        </Callout>
      )}

      {route.view === "import" ? (
        <ImportExportPanel
          bank={bank}
          onApply={commit}
          onClose={() => go({ view: "list" })}
        />
      ) : (
        <>
          <ListToolbar
            query={query}
            onQuery={(v) => {
              setQuery(v);
              setPage(1);
            }}
            filters={filters}
            onFilters={(patch) => {
              setFilters((prev) => ({ ...prev, ...patch }));
              setPage(1);
            }}
            sort={sort}
            onSort={setSort}
            categories={categories}
            total={bank.length}
            activeCount={activeCount}
            shown={filtered.length}
            problemTotal={problemTotal}
            onAdd={openNew}
            onImportExport={() => go({ view: "import" })}
            onRestoreDefaults={() => setPending({ kind: "restore" })}
            restoreDisabled={!hasCustomBank()}
          />

          {activeCount === 0 && bank.length > 0 && (
            <Callout tone="error" title="No questions are active">
              The game has nothing to show. Switch at least one question on.
            </Callout>
          )}

          {sessionLength > 0 && sessionLength > activeCount && (
            <Callout tone="warn" title="Session length is longer than the question bank">
              The game is set to {sessionLength} questions per session but only{" "}
              {activeCount} {activeCount === 1 ? "is" : "are"} active, so the wall
              will show {activeCount}. Activate more questions or lower the
              session length in the game’s facilitator panel.
            </Callout>
          )}

          <QuestionList
            rows={paged}
            positions={positions}
            total={bank.length}
            results={results}
            dragEnabled={dragEnabled}
            dragUid={dragUid}
            dropTarget={dropTarget}
            page={safePage}
            pageSize={pageSize}
            pageCount={pageCount}
            filtered={filtered.length}
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            onClearFilters={() => {
              setQuery("");
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
            cb={cb}
          />
        </>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <ConfirmDialog
        open={pending?.kind === "delete"}
        title="Delete this question?"
        body={
          <>
            <p className="font-bold text-ink">This action cannot be undone.</p>
            {pending?.kind === "delete" && byUid(pending.uid) && (
              <p className="mt-2 rounded-lg bg-ink/[0.04] px-3 py-2 text-xs">
                {shortPreview(byUid(pending.uid)!)}
                <span className="mt-1 block font-bold text-ink">
                  {byUid(pending.uid)!.answer}
                </span>
              </p>
            )}
            <p className="mt-2">
              The boxes on the wall are renumbered automatically, so nothing is
              left pointing at a missing question.
            </p>
          </>
        }
        confirmLabel="Delete Question"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending?.kind === "restore"}
        title={`Restore the ${SEED_BANK.length} bundled questions?`}
        body={
          <>
            <p className="font-bold text-ink">This action cannot be undone.</p>
            <p className="mt-2">
              Every question you have added or edited in this browser will be
              replaced by the bundled set. Export a backup first from{" "}
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  go({ view: "import" });
                }}
                className="font-bold text-ink underline"
              >
                Import / export
              </button>{" "}
              if you want to keep them.
            </p>
          </>
        }
        confirmLabel="Restore Defaults"
        onConfirm={confirmRestore}
        onCancel={() => setPending(null)}
      />

      {previewPuzzle && (
        <PreviewStage
          puzzle={previewPuzzle}
          result={results.get(previewPuzzle.uid)}
          variant="overlay"
          onClose={() => setPreviewUid(null)}
        />
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- header -- */

function Header({
  total,
  activeCount,
  sessionLength,
}: {
  total: number;
  activeCount: number;
  sessionLength: number;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
          Manage questions
        </h1>
        <p className="mt-0.5 text-xs text-ink-soft">
          {total} question{total === 1 ? "" : "s"} · {activeCount} active ·{" "}
          {sessionLength > 0
            ? `${Math.min(sessionLength, activeCount)} per session`
            : "all active questions per session"}{" "}
          · saved in this browser
        </p>
      </div>
      <div className="flex items-center gap-2">
        {ADMIN_AUTH_ENABLED && (
          <Btn
            onClick={() => {
              lock();
              window.location.href = "/";
            }}
          >
            Lock &amp; exit
          </Btn>
        )}
        <Link
          href="/"
          className="rounded-xl border border-ink/12 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink/[0.04]"
        >
          Back to game
        </Link>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- toast -- */

function Toast({
  toast,
  onDismiss,
}: {
  toast: { tone: "success" | "error"; text: string } | null;
  onDismiss: () => void;
}) {
  return (
    // Always mounted so the live region exists before the message arrives —
    // a region added at the same time as its text is often not announced.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[95] flex justify-center px-4"
    >
      {toast && (
        <div
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-lift ${
            toast.tone === "success"
              ? "border-ren-green/40 bg-ren-green-soft text-ren-green-deep"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {toast.text}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss message"
            className="rounded-full px-1.5 text-base leading-none opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
