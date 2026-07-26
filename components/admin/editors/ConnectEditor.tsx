"use client";

import { Callout } from "../ui";
import { StringRow, issueFor, type SubEditorProps } from "./shared";

/**
 * What Connects Them — exactly three clues.
 *
 * Fixed at three because PuzzleCanvas lays them out as three cards, and it keys
 * each card by the clue TEXT (`key={clue}` at :273) — so two identical clues
 * collide as React keys and one card silently disappears. The validator enforces
 * distinctness for that reason; the count is fixed here so the admin cannot get
 * into a two-or-four state at all.
 */
export default function ConnectEditor({ draft, issues, onChange }: SubEditorProps) {
  const clues = [0, 1, 2].map((i) => draft.clues?.[i] ?? "");

  const set = (i: number, v: string) => {
    const next = [...clues];
    next[i] = v;
    onChange({ clues: next });
  };

  const lower = clues.map((c) => c.trim().toLowerCase());
  const dupes = new Set(lower.filter((c, i) => c && lower.indexOf(c) !== i));

  return (
    <div className="flex flex-col gap-3">
      {clues.map((clue, i) => (
        <StringRow
          key={i}
          label={`Clue ${i + 1}`}
          value={clue}
          placeholder={
            ["A TELESCOPE", "A MOUNTAIN TOP", "SOMEONE ELSE’S CHAIR"][i]
          }
          error={
            issueFor(issues, `clues.${i}`) ??
            (dupes.has(clue.trim().toLowerCase())
              ? "This clue is the same as another one."
              : undefined)
          }
          onChange={(v) => set(i, v)}
        />
      ))}

      {issueFor(issues, "clues") && <Callout tone="error">{issueFor(issues, "clues")}</Callout>}

      <p className="text-[11px] leading-relaxed text-ink-soft">
        Three clues, and the answer is what links them. Each must be different —
        two identical clues break the card layout.
      </p>
    </div>
  );
}
