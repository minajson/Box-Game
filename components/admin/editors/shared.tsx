"use client";

import { useState } from "react";

import type { ManagedPuzzle } from "@/lib/types";
import type { Issue } from "@/lib/puzzleValidation";
import { removeAsset } from "@/lib/puzzleValidation";
import { dataUriBytes, findMedia, formatBytes, isUpload } from "@/lib/media";
import { estimateBankBytes } from "@/lib/download";

import MediaPicker from "../MediaPicker";
import { Btn, Callout, Field, IconBtn, TextInput } from "../ui";

/** Every type-specific editor takes the same three props. */
export interface SubEditorProps {
  draft: ManagedPuzzle;
  /** Issues already filtered to this editor's fields. */
  issues: Issue[];
  onChange: (patch: Partial<ManagedPuzzle>) => void;
}

/** First message for an exact field path, e.g. "rows.0.parts.1.size". */
export function issueFor(issues: Issue[], field: string): string | undefined {
  return issues.find((i) => i.field === field)?.message;
}

/** Messages for a field and anything nested under it. */
export function issuesUnder(issues: Issue[], prefix: string): Issue[] {
  return issues.filter((i) => i.field === prefix || i.field.startsWith(`${prefix}.`));
}

export function IssueList({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <Callout tone={issues.some((i) => i.severity === "error") ? "error" : "warn"}>
      <ul className="list-disc space-y-1 pl-4">
        {issues.map((i, n) => (
          <li key={n}>{i.message}</li>
        ))}
      </ul>
    </Callout>
  );
}

/* -------------------------------------------------------------- image bay -- */

/**
 * The image strip: thumbnail, path, replace, remove, alt text.
 *
 * ALT TEXT, HONESTLY. PuzzleCanvas decides the `alt` attribute differently per
 * type, and this component tells the truth about that rather than offering a
 * field that goes nowhere:
 *
 *   - rows types → alt IS `part.caption` (PuzzleCanvas.tsx:441), so the caption
 *     field on the clue is the alt text. Editable, and it is also displayed.
 *   - zoom → alt is derived from `puzzle.answer` (:181).
 *   - odd-one-out → the image renders `alt=""` with the label beside it (:238),
 *     which is correct: the label already names it.
 *
 * Adding a real per-image alt field would mean changing lib/types.ts AND
 * PuzzleCanvas.tsx — the live render path — for no gain on a projected game.
 */
export function ImageBay({
  draft,
  issues,
  onChange,
  index = 0,
  label = "Image",
  altNote,
}: SubEditorProps & {
  index?: number;
  label?: string;
  /** Explains where alt text comes from for this puzzle type. */
  altNote?: string;
}) {
  const [picking, setPicking] = useState(false);
  const path = draft.imageAssets[index];
  const media = path ? findMedia(path) : undefined;

  const set = (next: string) => {
    const assets = [...draft.imageAssets];
    assets[index] = next;
    onChange({ imageAssets: assets });
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </p>

      {path ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/12 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={path}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg border border-ink/10 object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">
              {media?.label ??
                (isUpload(path)
                  ? `Uploaded image (${formatBytes(dataUriBytes(path))})`
                  : path)}
            </p>
            {!isUpload(path) && (
              <p className="truncate text-[11px] text-ink-soft">{path}</p>
            )}
            {media?.alt && (
              <p className="mt-0.5 truncate text-[11px] italic text-ink-soft">
                “{media.alt}”
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Btn size="sm" onClick={() => setPicking(true)}>
              Replace
            </Btn>
            <IconBtn
              tone="danger"
              label={`Remove ${label.toLowerCase()}`}
              onClick={() => onChange(removeAsset(draft, index))}
            >
              ×
            </IconBtn>
          </div>
        </div>
      ) : (
        <Btn onClick={() => setPicking(true)}>Choose an image…</Btn>
      )}

      {altNote && <p className="text-[11px] leading-relaxed text-ink-soft">{altNote}</p>}

      <IssueList issues={issuesUnder(issues, "imageAssets")} />

      <MediaPicker
        open={picking}
        value={path}
        bankBytes={estimateBankBytes([draft])}
        onPick={set}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- string -- */

/** A simple repeatable list of strings (used for connect clues). */
export function StringRow({
  label,
  value,
  error,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} error={error} required>
      {(props) => (
        <TextInput
          {...props}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}
