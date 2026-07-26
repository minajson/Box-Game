"use client";

import { useState } from "react";

import { estimateBankBytes } from "@/lib/download";
import { findMedia } from "@/lib/media";
import { PART_SIZES } from "@/lib/puzzleValidation";
import type { PuzzlePart, PuzzleRow } from "@/lib/types";

import MediaPicker from "../MediaPicker";
import { Btn, Callout, Field, IconBtn, Select, TextInput, Toggle } from "../ui";
import { IssueList, issueFor, issuesUnder, type SubEditorProps } from "./shared";

/**
 * The visual builder for rebus / picture-word / picture-combo / emoji.
 *
 * A puzzle is ROWS of CLUES. A row is either a divider (the horizontal rule that
 * means "over", as in STAND over I = I UNDERSTAND) or a list of clues laid out
 * left to right.
 *
 * TWO CONVENTIONS THIS UI MAKES DISCOVERABLE
 * ------------------------------------------
 * 1. The big "+" between two picture clues is not a normal clue: PuzzleCanvas
 *    detects it as `part.muted && part.text === "+"` (:385) and gives it its own
 *    size, and `combine` reveals collapse it away as the clues slide together.
 *    Typing "+" into a text clue gets none of that — so there is a dedicated
 *    "+ joiner" button, and the validator warns if a bare "+" appears.
 * 2. `caption` is the label under a picture AND its `alt` text (:441) — but it
 *    names a piece of the answer, so PuzzleCanvas keeps it hidden until the
 *    answer is revealed. It is labelled as such rather than hidden behind a
 *    second field.
 */

const SIZE_LABELS: Record<(typeof PART_SIZES)[number], string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xl: "Extra large",
};

function isJoiner(part: PuzzlePart): boolean {
  return part.muted === true && part.text === "+";
}

export default function RowsEditor({ draft, issues, onChange }: SubEditorProps) {
  const [pickingFor, setPickingFor] = useState<{ row: number; part: number } | null>(null);
  const rows: PuzzleRow[] = draft.rows ?? [];

  const writeRows = (next: PuzzleRow[]) => onChange({ rows: next });

  const patchPart = (r: number, p: number, patch: Partial<PuzzlePart>) => {
    writeRows(
      rows.map((row, ri) =>
        ri !== r
          ? row
          : {
              ...row,
              parts: (row.parts ?? []).map((part, pi) =>
                pi === p ? { ...part, ...patch } : part,
              ),
            },
      ),
    );
  };

  /** Remove a key entirely rather than storing undefined, so CSV stays clean. */
  const dropPartKey = (r: number, p: number, key: keyof PuzzlePart) => {
    writeRows(
      rows.map((row, ri) =>
        ri !== r
          ? row
          : {
              ...row,
              parts: (row.parts ?? []).map((part, pi) => {
                if (pi !== p) return part;
                const copy = { ...part };
                delete copy[key];
                return copy;
              }),
            },
      ),
    );
  };

  const addRow = (divider = false) =>
    writeRows([...rows, divider ? { divider: true } : { parts: [{ text: "", size: "xl" }] }]);

  const removeRow = (r: number) => writeRows(rows.filter((_, i) => i !== r));

  const moveRow = (r: number, delta: -1 | 1) => {
    const to = r + delta;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[r], next[to]] = [next[to], next[r]];
    writeRows(next);
  };

  const addPart = (r: number, part: PuzzlePart) =>
    writeRows(
      rows.map((row, ri) =>
        ri !== r ? row : { ...row, parts: [...(row.parts ?? []), part] },
      ),
    );

  const removePart = (r: number, p: number) =>
    writeRows(
      rows.map((row, ri) =>
        ri !== r ? row : { ...row, parts: (row.parts ?? []).filter((_, pi) => pi !== p) },
      ),
    );

  const movePart = (r: number, p: number, delta: -1 | 1) => {
    const parts = [...(rows[r].parts ?? [])];
    const to = p + delta;
    if (to < 0 || to >= parts.length) return;
    [parts[p], parts[to]] = [parts[to], parts[p]];
    writeRows(rows.map((row, ri) => (ri !== r ? row : { ...row, parts })));
  };

  const setPartImage = (r: number, p: number, path: string) => {
    const assets = [...draft.imageAssets];
    let at = assets.indexOf(path);
    if (at === -1) {
      assets.push(path);
      at = assets.length - 1;
    }
    onChange({
      imageAssets: assets,
      rows: rows.map((row, ri) =>
        ri !== r
          ? row
          : {
              ...row,
              parts: (row.parts ?? []).map((part, pi) =>
                pi === p ? { ...part, assetIndex: at } : part,
              ),
            },
      ),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && (
        <Callout tone="warn">
          This question has no clues yet. Add a row of clues below.
        </Callout>
      )}

      {rows.map((row, r) => (
        <div
          key={r}
          className="rounded-xl border border-ink/12 bg-white p-3"
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
              Row {r + 1}
              {row.divider && " · divider"}
            </p>
            <div className="flex items-center gap-1">
              <IconBtn label={`Move row ${r + 1} up`} size="sm" disabled={r === 0} onClick={() => moveRow(r, -1)}>
                ↑
              </IconBtn>
              <IconBtn
                label={`Move row ${r + 1} down`}
                size="sm"
                disabled={r === rows.length - 1}
                onClick={() => moveRow(r, 1)}
              >
                ↓
              </IconBtn>
              <IconBtn tone="danger" label={`Delete row ${r + 1}`} size="sm" onClick={() => removeRow(r)}>
                ×
              </IconBtn>
            </div>
          </div>

          {row.divider ? (
            <div className="flex items-center gap-3">
              <span className="h-[5px] flex-1 rounded-full bg-ink/25" aria-hidden />
              <span className="text-xs font-semibold text-ink-soft">
                A horizontal rule — reads as “over”.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {(row.parts ?? []).map((part, p) => {
                const asset =
                  part.assetIndex !== undefined ? draft.imageAssets[part.assetIndex] : undefined;
                const path = `rows.${r}.parts.${p}`;

                if (isJoiner(part)) {
                  return (
                    <div
                      key={p}
                      className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-ink/20 bg-ink/[0.02] px-3 py-2"
                    >
                      <span className="text-sm font-black text-ink-soft">
                        + <span className="ml-2 text-xs font-semibold">joiner</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <IconBtn label="Move joiner left" size="sm" disabled={p === 0} onClick={() => movePart(r, p, -1)}>
                          ←
                        </IconBtn>
                        <IconBtn
                          label="Move joiner right"
                          size="sm"
                          disabled={p === (row.parts?.length ?? 0) - 1}
                          onClick={() => movePart(r, p, 1)}
                        >
                          →
                        </IconBtn>
                        <IconBtn tone="danger" label="Delete joiner" size="sm" onClick={() => removePart(r, p)}>
                          ×
                        </IconBtn>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={p} className="rounded-lg border border-ink/10 bg-ink/[0.015] p-2.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-soft">
                        Clue {p + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <IconBtn label={`Move clue ${p + 1} left`} size="sm" disabled={p === 0} onClick={() => movePart(r, p, -1)}>
                          ←
                        </IconBtn>
                        <IconBtn
                          label={`Move clue ${p + 1} right`}
                          size="sm"
                          disabled={p === (row.parts?.length ?? 0) - 1}
                          onClick={() => movePart(r, p, 1)}
                        >
                          →
                        </IconBtn>
                        <IconBtn tone="danger" label={`Delete clue ${p + 1}`} size="sm" onClick={() => removePart(r, p)}>
                          ×
                        </IconBtn>
                      </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <Field label="Text" error={issueFor(issues, path)}>
                        {(props) => (
                          <TextInput
                            {...props}
                            value={part.text ?? ""}
                            placeholder="STAND"
                            onChange={(e) => patchPart(r, p, { text: e.target.value })}
                          />
                        )}
                      </Field>

                      <Field label="Emoji">
                        {(props) => (
                          <TextInput
                            {...props}
                            value={part.emoji ?? ""}
                            placeholder="👥"
                            onChange={(e) => patchPart(r, p, { emoji: e.target.value })}
                            className="text-lg"
                          />
                        )}
                      </Field>

                      <Field
                        label="Caption (also the alt text)"
                        hint="Hidden while solving — appears under the clue only after Reveal Answer, so it can safely name the answer piece."
                      >
                        {(props) => (
                          <TextInput
                            {...props}
                            value={part.caption ?? ""}
                            placeholder="TEAM"
                            onChange={(e) => patchPart(r, p, { caption: e.target.value })}
                          />
                        )}
                      </Field>

                      <Field label="Size" error={issueFor(issues, `${path}.size`)}>
                        {(props) => (
                          <Select
                            {...props}
                            value={part.size ?? "lg"}
                            onChange={(e) =>
                              patchPart(r, p, { size: e.target.value as PuzzlePart["size"] })
                            }
                          >
                            {PART_SIZES.map((s) => (
                              <option key={s} value={s}>
                                {SIZE_LABELS[s]}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                    </div>

                    {/* Image */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {asset ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset}
                            alt=""
                            className="h-10 w-10 rounded-lg border border-ink/12 object-contain"
                          />
                          <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">
                            {findMedia(asset)?.label ?? asset}
                          </span>
                          <Btn size="sm" onClick={() => setPickingFor({ row: r, part: p })}>
                            Replace
                          </Btn>
                          <IconBtn
                            tone="danger"
                            label={`Remove image from clue ${p + 1}`}
                            size="sm"
                            onClick={() => dropPartKey(r, p, "assetIndex")}
                          >
                            ×
                          </IconBtn>
                        </>
                      ) : (
                        <Btn size="sm" onClick={() => setPickingFor({ row: r, part: p })}>
                          Add an image…
                        </Btn>
                      )}
                    </div>

                    {issueFor(issues, `${path}.assetIndex`) && (
                      <Callout tone="error" className="mt-2">
                        {issueFor(issues, `${path}.assetIndex`)}
                      </Callout>
                    )}

                    {/* Effects */}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] font-bold text-ink-soft">
                        Effects
                      </summary>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        <Toggle
                          label="Struck through"
                          checked={part.strike === true}
                          onChange={(v) =>
                            v ? patchPart(r, p, { strike: true }) : dropPartKey(r, p, "strike")
                          }
                        />
                        <Toggle
                          label="Mirrored"
                          checked={part.flip === true}
                          onChange={(v) =>
                            v ? patchPart(r, p, { flip: true }) : dropPartKey(r, p, "flip")
                          }
                        />
                        <Toggle
                          label="Empty outlined box"
                          hint="The literal box in THINK OUTSIDE THE BOX."
                          checked={part.boxed === true}
                          onChange={(v) =>
                            v ? patchPart(r, p, { boxed: true }) : dropPartKey(r, p, "boxed")
                          }
                        />
                        <Toggle
                          label="Dimmed"
                          checked={part.muted === true}
                          onChange={(v) =>
                            v ? patchPart(r, p, { muted: true }) : dropPartKey(r, p, "muted")
                          }
                        />
                        <Field label="Rotation (degrees)" error={issueFor(issues, `${path}.rotate`)}>
                          {(props) => (
                            <TextInput
                              {...props}
                              type="number"
                              min={-180}
                              max={180}
                              value={part.rotate ?? ""}
                              onChange={(e) =>
                                e.target.value === ""
                                  ? dropPartKey(r, p, "rotate")
                                  : patchPart(r, p, { rotate: Number(e.target.value) })
                              }
                            />
                          )}
                        </Field>
                      </div>
                    </details>
                  </div>
                );
              })}

              <div className="flex flex-wrap gap-2">
                <Btn size="sm" onClick={() => addPart(r, { text: "", size: "xl" })}>
                  + Clue
                </Btn>
                <Btn
                  size="sm"
                  onClick={() => addPart(r, { text: "+", size: "lg", muted: true })}
                  title="The large + shown between two picture clues"
                >
                  + Joiner
                </Btn>
              </div>

              <IssueList issues={issuesUnder(issues, `rows.${r}.parts`).filter((i) => i.field === `rows.${r}.parts`)} />
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => addRow(false)}>+ Add a row of clues</Btn>
        <Btn onClick={() => addRow(true)} title="A horizontal rule, reading as “over”">
          + Add a divider
        </Btn>
      </div>

      {issueFor(issues, "rows") && <Callout tone="error">{issueFor(issues, "rows")}</Callout>}
      <IssueList issues={issuesUnder(issues, "imageAssets")} />

      <MediaPicker
        open={pickingFor !== null}
        value={
          pickingFor !== null
            ? (() => {
                const part = rows[pickingFor.row]?.parts?.[pickingFor.part];
                return part?.assetIndex !== undefined
                  ? draft.imageAssets[part.assetIndex]
                  : undefined;
              })()
            : undefined
        }
        bankBytes={estimateBankBytes([draft])}
        onPick={(path) => {
          if (pickingFor) setPartImage(pickingFor.row, pickingFor.part, path);
        }}
        onClose={() => setPickingFor(null)}
      />
    </div>
  );
}
