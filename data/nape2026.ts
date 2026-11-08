import type { ClickOption, Puzzle, ReviewFlag } from "@/lib/types";
import source from "./nape2026.source.json";
import meta from "./nape2026.meta.json";

/**
 * The 80 NAPE 2026 questions, built from the supplied document.
 *
 *   nape2026.source.json   the document, parsed verbatim (scripts/build-nape-source.mjs)
 *   nape2026.meta.json     topics, flags, pictures and the five approved wording
 *                          revisions (scripts/build-nape-meta.mjs)
 *
 * Every question is a clickable "choice" challenge, so it gets the existing
 * answer cards, Submit Answer, suspense beat, mascot, scoring and confetti. The
 * correct flags live only in this data; nothing on screen reveals them before
 * the answer is submitted.
 *
 * Wording: the live prompt/options are the document's, except for the approved
 * revisions in the meta file. The document's own wording is always kept in
 * `nape.original`, so nothing is ever lost.
 */

interface SourceQuestion {
  n: number;
  set: number;
  prompt: string;
  options: { letter: string; label: string; correct: boolean }[];
  answerLabel: string;
  funFact: string;
}

interface Revision {
  prompt?: string;
  optionLabels?: Record<string, string>;
  funFact?: string;
}

interface Visual {
  src: string;
  kind: "photo" | "diagram";
  alt: string;
  zoom: boolean;
  focus?: { x: number; y: number };
}

interface QuestionMeta {
  topic: string;
  flags: ReviewFlag[];
  note?: string;
  revision?: Revision;
  visual?: Visual;
}

const BANNERS: Record<string, string> = {
  Geology: "GEOLOGY!",
  "Drilling & Production": "DRILL & PRODUCE!",
  "Health & Safety": "SAFETY FIRST!",
  "Industry & Business": "OIL & GAS BUSINESS!",
};

export const NAPE_ID_BASE = 100;
export const napeUid = (n: number) => `nape26-q${String(n).padStart(2, "0")}`;

function build(q: SourceQuestion): Puzzle {
  const m = (meta as unknown as Record<string, QuestionMeta>)[String(q.n)];
  const rev = m.revision;

  const options: ClickOption[] = q.options.map((o) => ({
    id: o.letter.toLowerCase(),
    label: rev?.optionLabels?.[o.letter] ?? o.label,
    correct: o.correct,
  }));
  const right = options.find((o) => o.correct)!;
  const trueFalse = q.options.length === 2;

  return {
    id: NAPE_ID_BASE + q.n,
    uid: napeUid(q.n),
    boxNumber: q.n, // Derived at runtime; see selectActive.
    type: "clickable",
    interaction: "choice",
    categoryLabel: BANNERS[m.topic] ?? "OIL & GAS QUIZ!",
    category: m.topic,
    difficulty: "medium",
    prompt: rev?.prompt ?? q.prompt,
    answer: right.label,
    // The document has no hints; the Hint button is hidden for these.
    hint: "",
    insight: rev?.funFact ?? q.funFact,
    imageAssets: m.visual ? [m.visual.src] : [],
    revealAnimation: "highlight",
    options,
    selectCount: 1,
    ...(m.visual
      ? {
          sceneAsset: 0,
          ...(m.visual.zoom ? { sceneZoom: true, sceneFocus: m.visual.focus } : {}),
        }
      : {}),
    events: ["nape-2026"],
    nape: {
      set: q.set,
      sourceNumber: q.n,
      topic: m.topic,
      format: trueFalse ? "true-false" : "multiple-choice",
      original: {
        prompt: q.prompt,
        options: q.options.map((o) => ({ label: o.label, correct: o.correct })),
        answer: q.answerLabel,
        funFact: q.funFact,
      },
      wording: rev ? "revised" : "original",
      flags: m.flags,
      ...(m.note ? { note: m.note } : {}),
      ...(m.visual ? { visual: m.visual.kind } : {}),
    },
  };
}

export const NAPE_PUZZLES: Puzzle[] = (source as SourceQuestion[]).map(build);
