"use client";

import { useState } from "react";

import { newUid } from "@/lib/puzzleStore";
import { estimateBankBytes } from "@/lib/download";
import { findMedia } from "@/lib/media";
import type { PuzzleChoice } from "@/lib/types";

import MediaPicker from "../MediaPicker";
import { Btn, Callout, Field, IconBtn, TextInput } from "../ui";
import { IssueList, issueFor, issuesUnder, type SubEditorProps } from "./shared";

/**
 * Odd One Out — exactly four options, one marked as the odd one.
 *
 * Fixed at four because PuzzleCanvas lays them out `grid-cols-2 lg:grid-cols-4`;
 * three or five options produce a lopsided wall.
 *
 * Two things this editor keeps in step automatically, because getting either
 * wrong is invisible until the reveal lands on stage:
 *
 *   - The ANSWER must equal the odd option's label — that is what the highlight
 *     animation keys off. Marking a different option as odd rewrites the answer.
 *   - Each option keeps a stable `id`, used as the React key (:220) and by
 *     `oddOneOutId`. Ids are generated, never typed, so they cannot collide.
 */

const PLACEHOLDERS = ["LISTENING", "ASKING", "INTERRUPTING", "SUMMARISING"];
const EMOJI_HINTS = ["👂", "🙋", "✋", "📝"];

function blankChoice(i: number): PuzzleChoice {
  return { id: `c-${newUid().slice(0, 8)}`, label: "", emoji: EMOJI_HINTS[i] ?? "" };
}

export default function OddOneOutEditor({ draft, issues, onChange }: SubEditorProps) {
  const [pickingFor, setPickingFor] = useState<number | null>(null);

  // Always present four rows, so the admin never sees a partial grid.
  const choices: PuzzleChoice[] = [0, 1, 2, 3].map(
    (i) => draft.choices?.[i] ?? blankChoice(i),
  );

  const write = (next: PuzzleChoice[], patch: Partial<typeof draft> = {}) =>
    onChange({ choices: next, ...patch });

  const setChoice = (i: number, patch: Partial<PuzzleChoice>) => {
    const next = choices.map((c, n) => (n === i ? { ...c, ...patch } : c));
    // Renaming the odd option must carry the answer with it.
    const isOdd = choices[i].id === draft.oddOneOutId;
    write(
      next,
      isOdd && patch.label !== undefined ? { answer: patch.label.toUpperCase() } : {},
    );
  };

  const markOdd = (i: number) => {
    write(choices, {
      oddOneOutId: choices[i].id,
      answer: (choices[i].label || "").toUpperCase(),
    });
  };

  const setImage = (i: number, path: string) => {
    // Choices reference images by INDEX into imageAssets, so append then point.
    const assets = [...draft.imageAssets];
    let at = assets.indexOf(path);
    if (at === -1) {
      assets.push(path);
      at = assets.length - 1;
    }
    onChange({
      imageAssets: assets,
      choices: choices.map((c, n) => (n === i ? { ...c, assetIndex: at } : c)),
    });
  };

  const clearImage = (i: number) => {
    onChange({
      choices: choices.map((c, n) => {
        if (n !== i) return c;
        // Delete the key rather than set it undefined: JSON.stringify drops
        // undefined, so the two would behave differently after a reload.
        const rest = { ...c };
        delete rest.assetIndex;
        return rest;
      }),
    });
  };

  const oddIndex = choices.findIndex((c) => c.id === draft.oddOneOutId);

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label="Which option is the odd one out"
        className="flex flex-col gap-2.5"
      >
        {choices.map((choice, i) => {
          const isOdd = i === oddIndex;
          const asset =
            choice.assetIndex !== undefined
              ? draft.imageAssets[choice.assetIndex]
              : undefined;

          return (
            <div
              key={choice.id}
              className={`rounded-xl border p-3 transition ${
                isOdd
                  ? "border-ren-green bg-ren-green-soft ring-2 ring-ren-green/25"
                  : "border-ink/12 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-end gap-2.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isOdd}
                  onClick={() => markOdd(i)}
                  title="Mark this as the odd one out"
                  className={`mb-1 flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-black uppercase tracking-[0.1em] transition ${
                    isOdd
                      ? "border-ren-green-deep bg-ren-green text-white"
                      : "border-ink/15 bg-white text-ink-soft hover:text-ink"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full border-2 ${
                      isOdd ? "border-white bg-white/40" : "border-ink/30"
                    }`}
                    aria-hidden
                  />
                  {isOdd ? "Odd one" : "Mark odd"}
                </button>

                <Field
                  label={`Option ${i + 1} label`}
                  required
                  error={issueFor(issues, `choices.${i}.label`)}
                  className="min-w-[10rem] flex-1"
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      value={choice.label}
                      placeholder={PLACEHOLDERS[i]}
                      onChange={(e) => setChoice(i, { label: e.target.value.toUpperCase() })}
                      className="uppercase"
                    />
                  )}
                </Field>

                <Field
                  label="Emoji"
                  error={issueFor(issues, `choices.${i}.emoji`)}
                  className="w-24"
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      value={choice.emoji ?? ""}
                      placeholder={EMOJI_HINTS[i]}
                      onChange={(e) => setChoice(i, { emoji: e.target.value })}
                      className="text-center text-lg"
                    />
                  )}
                </Field>

                <div className="mb-1 flex items-center gap-1.5">
                  {asset ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset}
                        alt=""
                        className="h-9 w-9 rounded-lg border border-ink/12 object-contain"
                        title={findMedia(asset)?.label ?? asset}
                      />
                      <IconBtn
                        tone="danger"
                        label={`Remove image from option ${i + 1}`}
                        onClick={() => clearImage(i)}
                      >
                        ×
                      </IconBtn>
                    </>
                  ) : (
                    <Btn size="sm" onClick={() => setPickingFor(i)}>
                      Image…
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {issueFor(issues, "choices") && (
        <Callout tone="error">{issueFor(issues, "choices")}</Callout>
      )}
      {issueFor(issues, "oddOneOutId") && (
        <Callout tone="error">{issueFor(issues, "oddOneOutId")}</Callout>
      )}
      <IssueList issues={issuesUnder(issues, "imageAssets")} />

      <Callout>
        An option shows its image if it has one, otherwise its emoji — plus the
        label underneath either way. The <strong>answer</strong> is kept in step
        with the odd option’s label automatically, because that is what the
        reveal highlights.
      </Callout>

      <MediaPicker
        open={pickingFor !== null}
        value={
          pickingFor !== null && choices[pickingFor].assetIndex !== undefined
            ? draft.imageAssets[choices[pickingFor].assetIndex!]
            : undefined
        }
        bankBytes={estimateBankBytes([draft])}
        onPick={(path) => {
          if (pickingFor !== null) setImage(pickingFor, path);
        }}
        onClose={() => setPickingFor(null)}
      />
    </div>
  );
}
