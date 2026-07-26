"use client";

import { autoScramble, isPermutation, letterSignature } from "@/lib/puzzleValidation";
import { Btn, Callout, Field, TextInput } from "../ui";
import { issueFor, type SubEditorProps } from "./shared";

/**
 * Word scramble.
 *
 * The jumble must be an exact letter-for-letter permutation of the answer,
 * because the reveal animation pairs each tile with the position it belongs to
 * (`solveOrder` in PuzzleCanvas.tsx). A jumble with a wrong letter does not
 * error at runtime — it silently DROPS that tile, so the answer appears on stage
 * with a letter missing. Hence the Shuffle button: it is the reliable way to get
 * a valid jumble, and it is right there next to the field.
 */
export default function ScrambleEditor({ draft, issues, onChange }: SubEditorProps) {
  const scrambled = draft.scrambledValue ?? "";
  const answer = draft.answer ?? "";
  const matches = answer.trim() !== "" && isPermutation(scrambled, answer);

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Jumbled letters"
        required
        error={issueFor(issues, "scrambledValue")}
        hint="Exactly the letters of the answer, in a different order. Spaces are ignored."
      >
        {(props) => (
          <div className="flex gap-2">
            <TextInput
              {...props}
              value={scrambled}
              onChange={(e) => onChange({ scrambledValue: e.target.value.toUpperCase() })}
              placeholder="WROGHT"
              className="font-black uppercase tracking-[0.2em]"
            />
            <Btn
              onClick={() => onChange({ scrambledValue: autoScramble(answer) })}
              disabled={answer.trim().length < 2}
              title="Shuffle the answer's letters into a valid jumble"
            >
              Shuffle
            </Btn>
          </div>
        )}
      </Field>

      {answer.trim() === "" ? (
        <Callout>Enter the answer first, then press Shuffle.</Callout>
      ) : matches ? (
        <Callout tone="success">
          These are exactly the letters of “{answer.trim().toUpperCase()}”.
        </Callout>
      ) : (
        scrambled.trim() !== "" && (
          <Callout tone="error" title="The letters do not match the answer">
            <p>
              Jumble: <strong>{letterSignature(scrambled) || "—"}</strong>
            </p>
            <p>
              Answer: <strong>{letterSignature(answer) || "—"}</strong>
            </p>
            <p className="mt-1">
              Press <strong>Shuffle</strong> to rebuild it from the answer.
            </p>
          </Callout>
        )
      )}
    </div>
  );
}
