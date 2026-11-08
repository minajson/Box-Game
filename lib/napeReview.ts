import { toCsv } from "./csv";
import type { ManagedPuzzle } from "./types";

/**
 * The NAPE review report: one row per imported question, for the people who
 * sign the quiz off. It carries the document's wording next to the live
 * wording, the correct answer, the fun fact, any review flags and the box the
 * question sits in — so a reviewer never has to play the game to check it.
 *
 * Reviewer-facing only. Nothing here is ever rendered to players.
 */
export function napeReviewCsv(bank: ManagedPuzzle[]): string {
  const rows = bank
    .filter((p) => p.nape)
    .sort((a, b) => a.nape!.sourceNumber - b.nape!.sourceNumber)
    .map((p) => {
      const n = p.nape!;
      const revised = n.wording === "revised";
      return [
        String(n.sourceNumber),
        String(n.set),
        n.topic,
        n.format === "true-false" ? "True/False" : "Multiple choice",
        p.active ? "Active" : "Hidden",
        p.active ? String(p.boxNumber) : "",
        p.prompt,
        revised ? n.original.prompt : "",
        p.options?.map((o) => `${o.correct ? "✓ " : ""}${o.label}`).join(" | ") ?? "",
        revised ? n.original.options.map((o) => `${o.correct ? "✓ " : ""}${o.label}`).join(" | ") : "",
        p.answer,
        n.original.answer !== p.answer ? n.original.answer : "",
        p.insight ?? "",
        p.insight !== n.original.funFact ? n.original.funFact : "",
        n.flags.join(", "),
        n.note ?? "",
        n.visual ?? "none",
      ];
    });

  return toCsv(
    [
      [
      "Source #",
      "Set",
      "Topic",
      "Format",
      "Status",
      "Box",
      "Live question",
      "Original wording (if revised)",
      "Options (✓ = correct)",
      "Original options (if revised)",
      "Correct answer",
      "Original answer (if revised)",
      "Fun fact",
      "Original fun fact (if revised)",
      "Review flags",
      "Reviewer note",
      "Picture",
      ],
      ...rows,
    ],
    { bom: true },
  );
}
