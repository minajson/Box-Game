"use client";

import type { ManagedPuzzle } from "@/lib/types";
import type { ValidationResult } from "@/lib/puzzleValidation";
import { TYPE_LABELS } from "@/lib/puzzleValidation";

import PreviewStage from "./PreviewStage";
import QuestionForm from "./QuestionForm";
import { Btn, Callout } from "./ui";

/**
 * The add/edit screen: form on the left, live preview on the right.
 *
 * The preview sits beside the form rather than behind a button because the whole
 * point of these puzzle types is how they LOOK — a rebus that reads perfectly in
 * a text field can still be unreadable at the back of a hall.
 *
 * Below 1280px the preview moves above the form (collapsed), and on a phone it
 * is only reachable full-screen — there is no width to show both.
 */

export default function QuestionEditor({
  draft,
  isNew,
  total,
  result,
  categories,
  dirty,
  liveSession,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ManagedPuzzle;
  isNew: boolean;
  total: number;
  result: ValidationResult;
  categories: string[];
  dirty: boolean;
  liveSession: number;
  onChange: (patch: Partial<ManagedPuzzle>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const blocked = !result.ok;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col">
      {/* Sticky action bar — save is always reachable, however long the form. */}
      <div className="sticky top-0 z-30 border-b border-ink/10 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-soft">
              {isNew ? "New question" : `Editing · ${TYPE_LABELS[draft.type]}`}
            </p>
            <h1 className="truncate text-lg font-black text-ink">
              {draft.answer || "Untitled question"}
              {dirty && (
                <span className="ml-2 align-middle text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                  unsaved
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Btn onClick={onCancel}>Cancel</Btn>
            <Btn
              tone="primary"
              onClick={onSave}
              disabled={blocked}
              title={
                blocked
                  ? "Fix the problems listed below before saving"
                  : isNew
                    ? "Add this question"
                    : "Save this question"
              }
            >
              {isNew ? "Add question" : "Save changes"}
            </Btn>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:p-6 xl:flex-row">
        {/* ------------------------------------------------------------ form */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {blocked && (
            <Callout
              tone="error"
              title={`${result.errors.length} problem${result.errors.length === 1 ? "" : "s"} to fix before saving`}
            >
              <ul className="list-disc space-y-1 pl-4">
                {result.errors.map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
              </ul>
            </Callout>
          )}

          {!blocked && result.warnings.length > 0 && (
            <Callout tone="warn" title="Worth a look — you can still save">
              <ul className="list-disc space-y-1 pl-4">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </Callout>
          )}

          {liveSession > 0 && (
            <Callout tone="warn">
              A game session is in progress ({liveSession} box
              {liveSession === 1 ? "" : "es"} opened). Saving will reset it and
              clear the score.
            </Callout>
          )}

          <QuestionForm
            draft={draft}
            result={result}
            categories={categories}
            total={total}
            onChange={onChange}
          />

          {/* Repeated at the bottom: on a long form the sticky bar is a long
              way from where the admin finishes typing. */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 pt-4">
            <Btn onClick={onCancel}>Cancel</Btn>
            <Btn tone="primary" onClick={onSave} disabled={blocked}>
              {isNew ? "Add question" : "Save changes"}
            </Btn>
          </div>
        </div>

        {/* --------------------------------------------------------- preview */}
        <aside className="w-full shrink-0 xl:sticky xl:top-[5.5rem] xl:w-[34rem] xl:self-start">
          <div className="rounded-2xl border border-ink/10 bg-white/80 p-4 shadow-panel backdrop-blur">
            <PreviewStage puzzle={draft} result={result} variant="panel" />
          </div>
        </aside>
      </div>
    </main>
  );
}
