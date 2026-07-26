"use client";

import {
  buildMask,
  maskBlankIndexes,
  maskSlots,
  suggestBlanks,
} from "@/lib/puzzleValidation";
import { Btn, Callout, Field, TextInput } from "../ui";
import { issueFor, type SubEditorProps } from "./shared";

/**
 * Missing letters.
 *
 * Typing `L E _ D E _ S H _ P` by hand and keeping it aligned with the answer is
 * fiddly and easy to get wrong by one character, so the primary control is a row
 * of letter toggles: click a letter to blank it. The raw field stays available
 * underneath for anyone who prefers to type or paste it.
 *
 * Slot indexes are computed on the WHITESPACE-STRIPPED answer, because that is
 * what PuzzleCanvas does (`maskedValue.replace(/\s+/g, "")` at :111) — so the
 * spaces in the stored value are cosmetic only.
 */
export default function MissingLettersEditor({
  draft,
  issues,
  onChange,
}: SubEditorProps) {
  const answer = draft.answer ?? "";
  const slots = maskSlots(answer).split("");
  const masked = draft.maskedValue ?? "";
  const blanks = new Set(maskBlankIndexes(masked));

  const setMask = (indexes: number[]) =>
    onChange({ maskedValue: buildMask(answer, indexes) });

  const toggle = (i: number) => {
    const next = new Set(blanks);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setMask([...next].sort((a, b) => a - b));
  };

  const aligned = slots.length > 0 && masked.replace(/\s+/g, "").length === slots.length;

  return (
    <div className="flex flex-col gap-3">
      {slots.length === 0 ? (
        <Callout>Enter the answer first, then choose which letters to hide.</Callout>
      ) : (
        <>
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
              Click a letter to hide it
            </p>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((ch, i) => {
                const hidden = aligned && blanks.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={hidden}
                    aria-label={`Letter ${i + 1}, ${ch}. ${hidden ? "Hidden" : "Shown"}.`}
                    className={`h-10 w-9 rounded-lg border-b-4 text-base font-black transition ${
                      hidden
                        ? "border-ink/25 border-dashed bg-ink/[0.05] text-ink-soft"
                        : "border-ren-green-deep bg-ren-green text-white"
                    }`}
                  >
                    {hidden ? "_" : ch}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">
              {blanks.size} of {slots.length} letters hidden.
              {blanks.size === 0 && " Hide at least one."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Btn size="sm" onClick={() => setMask(suggestBlanks(answer, "every3"))}>
              Hide every third
            </Btn>
            <Btn size="sm" onClick={() => setMask(suggestBlanks(answer, "vowels"))}>
              Hide the vowels
            </Btn>
            <Btn size="sm" onClick={() => setMask([])}>
              Show all
            </Btn>
          </div>
        </>
      )}

      <details className="rounded-xl border border-ink/12 bg-white p-3">
        <summary className="cursor-pointer text-xs font-bold text-ink">
          Edit the mask directly
        </summary>
        <div className="mt-3">
          <Field
            label="Masked answer"
            required
            error={issueFor(issues, "maskedValue")}
            hint="One slot per letter, _ for each blank. Spaces are ignored, so use them for legibility."
          >
            {(props) => (
              <TextInput
                {...props}
                value={masked}
                onChange={(e) => onChange({ maskedValue: e.target.value.toUpperCase() })}
                placeholder="L E _ D E _ S H _ P"
                className="font-black uppercase tracking-[0.2em]"
              />
            )}
          </Field>
        </div>
      </details>
    </div>
  );
}
