"use client";

import {
  DEFAULT_CATEGORY_LABEL,
  DEFAULT_PROMPT,
  DEFAULT_REVEAL,
  REVEAL_ANIMATIONS,
  TYPE_LABELS,
  usesRows,
  type Issue,
  type ValidationResult,
} from "@/lib/puzzleValidation";
import {
  PUZZLE_DIFFICULTIES,
  PUZZLE_TYPES,
  type ManagedPuzzle,
  type PuzzleDifficulty,
  type PuzzleType,
} from "@/lib/types";

import ConnectEditor from "./editors/ConnectEditor";
import MissingLettersEditor from "./editors/MissingLettersEditor";
import MythFactEditor from "./editors/MythFactEditor";
import OddOneOutEditor from "./editors/OddOneOutEditor";
import RowsEditor from "./editors/RowsEditor";
import ScrambleEditor from "./editors/ScrambleEditor";
import ZoomEditor from "./editors/ZoomEditor";
import type { SubEditorProps } from "./editors/shared";
import { Callout, Field, Section, Segmented, Select, TextArea, TextInput, Toggle } from "./ui";

/**
 * The add/edit form: shared fields, then the editor for the chosen type.
 *
 * Changing the TYPE rewrites the type-specific payload rather than carrying it
 * across — a scramble's `scrambledValue` is meaningless on a rebus, and leaving
 * it behind would ship dead data into the CSV export. Shared content (answer,
 * hint, category) is always kept.
 */

/** Fields the shared section owns; everything else belongs to a sub-editor. */
const COMMON_FIELDS = new Set([
  "type",
  "answer",
  "prompt",
  "hint",
  "insight",
  "category",
  "categoryLabel",
  "difficulty",
  "revealAnimation",
  "uid",
  "id",
  "challenge",
]);

function splitIssues(result: ValidationResult): {
  common: Issue[];
  specific: Issue[];
} {
  const all = [...result.errors, ...result.warnings];
  return {
    common: all.filter((i) => COMMON_FIELDS.has(i.field)),
    specific: all.filter((i) => !COMMON_FIELDS.has(i.field)),
  };
}

/**
 * Dispatch to the editor for the chosen type. Declared at module scope, not
 * inside QuestionForm: a component defined during render is a brand-new type on
 * every keystroke, so React unmounts and remounts the whole subtree — which
 * would blow away the media picker's open state and every `details` toggle.
 */
function SubEditor({ draft, issues, onChange }: SubEditorProps) {
  switch (draft.type) {
    case "scramble":
      return <ScrambleEditor draft={draft} issues={issues} onChange={onChange} />;
    case "missing-letters":
      return <MissingLettersEditor draft={draft} issues={issues} onChange={onChange} />;
    case "odd-one-out":
      return <OddOneOutEditor draft={draft} issues={issues} onChange={onChange} />;
    case "connect":
      return <ConnectEditor draft={draft} issues={issues} onChange={onChange} />;
    case "myth-fact":
      return <MythFactEditor draft={draft} issues={issues} onChange={onChange} />;
    case "zoom":
      return <ZoomEditor draft={draft} issues={issues} onChange={onChange} />;
    default:
      return <RowsEditor draft={draft} issues={issues} onChange={onChange} />;
  }
}

export default function QuestionForm({
  draft,
  result,
  categories,
  total,
  onChange,
}: {
  draft: ManagedPuzzle;
  result: ValidationResult;
  categories: string[];
  total: number;
  onChange: (patch: Partial<ManagedPuzzle>) => void;
}) {
  const { common, specific } = splitIssues(result);
  const err = (field: string) =>
    common.find((i) => i.field === field && i.severity === "error")?.message;
  const warnOn = (field: string) =>
    common.find((i) => i.field === field && i.severity === "warning")?.message;

  /**
   * Swap the type: drop the payload that belonged to the old one, and seed the
   * defaults for the new one where the admin has not written their own text.
   */
  const changeType = (next: PuzzleType) => {
    const wasDefaultLabel =
      !draft.categoryLabel.trim() ||
      Object.values(DEFAULT_CATEGORY_LABEL).includes(draft.categoryLabel);
    const wasDefaultPrompt =
      !draft.prompt.trim() || Object.values(DEFAULT_PROMPT).includes(draft.prompt);

    const patch: Partial<ManagedPuzzle> = {
      type: next,
      revealAnimation: DEFAULT_REVEAL[next],
      // Undefined removes the key on the spread in QuestionsAdmin.patchDraft.
      scrambledValue: undefined,
      maskedValue: undefined,
      choices: undefined,
      oddOneOutId: undefined,
      clues: undefined,
      rows: undefined,
    };

    if (wasDefaultLabel) patch.categoryLabel = DEFAULT_CATEGORY_LABEL[next];
    if (wasDefaultPrompt) patch.prompt = DEFAULT_PROMPT[next];

    // Seed a usable starting shape so the new editor is not empty.
    if (next === "connect") patch.clues = ["", "", ""];
    if (next === "myth-fact") {
      patch.clues = [""];
      patch.answer = "MYTH";
    } else if (draft.type === "myth-fact") {
      // MYTH or FACT would read as a real answer on any other type.
      patch.answer = "";
    }
    if (usesRows(next)) patch.rows = [{ parts: [{ text: "", size: "xl" }] }];

    onChange(patch);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* -------------------------------------------------------------- type */}
      <Section
        title="Question type"
        description="This decides which fields the question needs, and how the answer is revealed."
      >
        <Field label="Type" required error={err("type")}>
          {(props) => (
            <Select
              {...props}
              value={draft.type}
              onChange={(e) => changeType(e.target.value as PuzzleType)}
            >
              {PUZZLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Section>

      {/* ------------------------------------------------------------ puzzle */}
      <Section
        title={TYPE_LABELS[draft.type]}
        description="The clues the audience actually sees."
      >
        <SubEditor draft={draft} issues={specific} onChange={onChange} />
      </Section>

      {/* ------------------------------------------------------------ answer */}
      <Section title="Answer and text">
        <div className="flex flex-col gap-3">
          {draft.type === "myth-fact" ? (
            // The answer is picked in the Myth or Fact section above.
            err("answer") && <Callout tone="error">{err("answer")}</Callout>
          ) : (
            <Field
              label="Answer"
              required
              error={err("answer")}
              hint={warnOn("answer") ?? "Short and uppercase — it is shown very large on the reveal."}
            >
              {(props) => (
                <TextInput
                  {...props}
                  value={draft.answer}
                  onChange={(e) => onChange({ answer: e.target.value.toUpperCase() })}
                  placeholder="GROWTH"
                  className="font-black uppercase"
                />
              )}
            </Field>
          )}

          <Field
            label="Prompt"
            required
            error={err("prompt")}
            hint="The instruction above the puzzle."
          >
            {(props) => (
              <TextInput
                {...props}
                value={draft.prompt}
                onChange={(e) => onChange({ prompt: e.target.value })}
                placeholder={DEFAULT_PROMPT[draft.type]}
              />
            )}
          </Field>

          <Field
            label="Hint"
            required
            error={err("hint")}
            hint={warnOn("hint") ?? "Shown when the facilitator presses Hint."}
          >
            {(props) => (
              <TextArea
                {...props}
                value={draft.hint}
                onChange={(e) => onChange({ hint: e.target.value })}
                placeholder="The whole point of stepping outside your comfort zone."
              />
            )}
          </Field>

          <Field
            label={draft.type === "myth-fact" ? "Explanation" : "Insight (optional)"}
            required={draft.type === "myth-fact"}
            error={err("insight")}
            hint={
              warnOn("insight") ??
              (draft.type === "myth-fact"
                ? "Shown in large text beneath the cards on the reveal."
                : "A line the facilitator can read out after the reveal.")
            }
          >
            {(props) => (
              <TextArea
                {...props}
                value={draft.insight ?? ""}
                onChange={(e) => onChange({ insight: e.target.value })}
                placeholder="Nobody ever grew inside their comfort zone."
              />
            )}
          </Field>
        </div>
      </Section>

      {/* --------------------------------------------------------- filing -- */}
      <Section title="Filing and behaviour">
        <div className="flex flex-col gap-3">
          <Field
            label="Reveal label"
            required
            error={err("categoryLabel")}
            hint="The banner shown as the box bursts open."
          >
            {(props) => (
              <TextInput
                {...props}
                value={draft.categoryLabel}
                onChange={(e) => onChange({ categoryLabel: e.target.value.toUpperCase() })}
                placeholder={DEFAULT_CATEGORY_LABEL[draft.type]}
                className="font-black uppercase"
              />
            )}
          </Field>

          <Field
            label="Category"
            error={err("category")}
            hint="Your own grouping, used for filtering in this admin only."
          >
            {(props) => (
              <>
                <TextInput
                  {...props}
                  list="admin-categories"
                  value={draft.category}
                  onChange={(e) => onChange({ category: e.target.value })}
                  placeholder="General"
                />
                <datalist id="admin-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>

          <div>
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
              Difficulty
            </p>
            <Segmented
              label="Difficulty"
              value={draft.difficulty}
              options={PUZZLE_DIFFICULTIES.map((d) => ({
                value: d,
                label: d.charAt(0).toUpperCase() + d.slice(1),
              }))}
              onChange={(d) => onChange({ difficulty: d as PuzzleDifficulty })}
            />
          </div>

          <Field
            label="Reveal animation"
            error={err("revealAnimation")}
            hint={
              warnOn("revealAnimation") ??
              `${TYPE_LABELS[draft.type]} is built around “${DEFAULT_REVEAL[draft.type]}”.`
            }
          >
            {(props) => (
              <Select
                {...props}
                value={draft.revealAnimation}
                onChange={(e) =>
                  onChange({ revealAnimation: e.target.value as ManagedPuzzle["revealAnimation"] })
                }
              >
                {REVEAL_ANIMATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                    {r === DEFAULT_REVEAL[draft.type] ? " (recommended)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Position in the list"
            hint={`1 puts it first. There ${total === 1 ? "is" : "are"} ${total} question${total === 1 ? "" : "s"}.`}
          >
            {(props) => (
              <TextInput
                {...props}
                type="number"
                min={1}
                max={Math.max(total, 1)}
                value={draft.order + 1}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) onChange({ order: Math.max(0, Math.round(n) - 1) });
                }}
              />
            )}
          </Field>

          <Toggle
            label="Active"
            hint="Inactive questions keep their content but never appear on the wall."
            checked={draft.active}
            onChange={(v) => onChange({ active: v })}
          />

          {!draft.active && (
            <Callout tone="warn">
              This question is inactive, so it will not be in the game until you
              switch it on.
            </Callout>
          )}
        </div>
      </Section>

      {(err("uid") || err("id") || err("challenge")) && (
        <Callout tone="error" title="Internal problem">
          {err("uid") ?? err("id") ?? err("challenge")}
        </Callout>
      )}
    </div>
  );
}
