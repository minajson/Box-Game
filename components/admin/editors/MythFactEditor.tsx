"use client";

import { MYTH_FACT_ANSWERS } from "@/lib/puzzleValidation";

import { Callout, Field, Segmented, TextArea } from "../ui";
import { issueFor, type SubEditorProps } from "./shared";

/**
 * Myth or Fact — one statement and a two-way answer.
 *
 * The answer is picked here rather than typed into the shared Answer field,
 * because anything other than MYTH or FACT could never be highlighted on stage.
 */
export default function MythFactEditor({ draft, issues, onChange }: SubEditorProps) {
  const statementIssue = issueFor(issues, "clues.0");

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Statement"
        required
        error={statementIssue}
        hint="Shown large above the MYTH and FACT cards."
      >
        {(props) => (
          <TextArea
            {...props}
            value={draft.clues?.[0] ?? ""}
            onChange={(e) => onChange({ clues: [e.target.value] })}
            placeholder="A little stress can help you focus and get things done."
          />
        )}
      </Field>

      <div>
        <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
          Correct answer
        </p>
        <Segmented
          label="Correct answer"
          value={draft.answer}
          options={MYTH_FACT_ANSWERS.map((a) => ({ value: a, label: a }))}
          onChange={(answer) => onChange({ answer })}
        />
      </div>

      {issueFor(issues, "clues") && <Callout tone="error">{issueFor(issues, "clues")}</Callout>}
    </div>
  );
}
