/**
 * CRACK THE BOX — shared types.
 *
 * Puzzle content lives in `data/puzzles.ts` and is intentionally decoupled from
 * the UI: components render whatever a puzzle's payload describes, and image
 * paths only ever come from `imageAssets`, never from a component.
 */

/** The eleven supported puzzle types. (Wild Card was removed by request.) */
export type PuzzleType =
  | "rebus"
  | "scramble"
  | "picture-word"
  | "picture-combo"
  | "emoji"
  | "missing-letters"
  | "zoom"
  | "odd-one-out"
  | "connect"
  | "myth-fact"
  | "clickable";

export const PUZZLE_TYPES: PuzzleType[] = [
  "rebus",
  "scramble",
  "picture-word",
  "picture-combo",
  "emoji",
  "missing-letters",
  "zoom",
  "odd-one-out",
  "connect",
  "myth-fact",
  "clickable",
];

/**
 * How a clickable challenge is answered. Every other type is answered out loud;
 * these are answered by the facilitator clicking what the room chooses.
 *
 *   choice    pick option card(s), optionally after a three-stage zoom
 *   hotspot   click places on the scene image (a person, an object, a detail)
 *   sequence  click the option cards in the right order
 */
export type ClickInteraction = "choice" | "hotspot" | "sequence";

export const CLICK_INTERACTIONS: ClickInteraction[] = ["choice", "hotspot", "sequence"];

/** An answer card for a choice or sequence challenge. */
export interface ClickOption {
  id: string;
  label: string;
  /** A smaller supporting line under the label. */
  detail?: string;
  /** Index into the puzzle's `imageAssets` array for a photo on the card. */
  assetIndex?: number;
  /** choice only: this option is (one of) the right answers. */
  correct?: boolean;
}

/** A rectangle on the scene image, in percent of its width and height. */
export interface HotspotArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Something to find on a hotspot challenge's scene. A click anywhere inside any
 * of its areas finds it. Its label is shown only after the answer is submitted.
 */
export interface Hotspot {
  id: string;
  label: string;
  areas: HotspotArea[];
  /** Which area carries the label after submission. Defaults to the first. */
  labelArea?: number;
  /**
   * Which side of that area the label sits on. Defaults to below (above near
   * the bottom edge); set it to keep the label off text the room must read.
   */
  labelSide?: HotspotLabelSide;
}

export type HotspotLabelSide = "below" | "above" | "left" | "right";

export const HOTSPOT_LABEL_SIDES: HotspotLabelSide[] = ["below", "above", "left", "right"];

/** What the facilitator has clicked so far on a clickable challenge. */
export interface ClickResponse {
  /** choice: the selected option ids. sequence: the ids in the order clicked. */
  picks: string[];
  /** hotspot: the click positions, in percent of the scene image. */
  marks: { x: number; y: number }[];
}

/** Admin-facing difficulty banding. Purely for filtering — the game ignores it. */
export type PuzzleDifficulty = "easy" | "medium" | "hard";

export const PUZZLE_DIFFICULTIES: PuzzleDifficulty[] = [
  "easy",
  "medium",
  "hard",
];

export type RevealAnimation =
  | "rearrange" // scrambled letters physically travel into place
  | "fade" // hidden words fade into view
  | "combine" // picture clues slide together
  | "fill-letters" // missing letters drop into their slots
  | "zoom-out" // the full image is revealed
  | "highlight"; // the correct object is highlighted

/** A single visual element inside a rebus / picture / emoji layout. */
export interface PuzzlePart {
  /** Text to display (letters, a word, or a fragment). */
  text?: string;
  /** Emoji or glyph to display instead of / alongside text. */
  emoji?: string;
  /** Index into the puzzle's `imageAssets` array. Never a raw path. */
  assetIndex?: number;
  /** Caption shown under an image or emoji. */
  caption?: string;
  /** Relative visual weight. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Strike the element through (e.g. "no I in TEAM"). */
  strike?: boolean;
  /** Mirror horizontally (e.g. a word written backwards). */
  flip?: boolean;
  /** Rotate by degrees. */
  rotate?: number;
  /** Draw an empty outlined box (the "box" in THINK OUTSIDE THE BOX). */
  boxed?: boolean;
  /** Render dimmed, as supporting detail. */
  muted?: boolean;
}

/** One horizontal row of a rebus. A `divider` row draws a rule ("over"). */
export interface PuzzleRow {
  parts?: PuzzlePart[];
  divider?: boolean;
}

/** Choice used by odd-one-out. */
export interface PuzzleChoice {
  id: string;
  label: string;
  emoji?: string;
  assetIndex?: number;
}

export interface Puzzle {
  id: number;
  boxNumber: number;
  type: PuzzleType;
  /** Dramatic reveal shown as the box bursts open, e.g. "SCRAMBLE IT!". */
  categoryLabel: string;
  /** Short instruction shown above the puzzle. */
  prompt: string;
  answer: string;
  hint: string;
  /** Optional one-line note the facilitator can read out after the reveal. */
  insight?: string;
  /** Image paths, resolved from data only. Empty when a puzzle is text/emoji. */
  imageAssets: string[];
  revealAnimation: RevealAnimation;

  // --- Admin metadata -------------------------------------------------
  // All optional so the bundled seed in data/puzzles.ts needs no edits; the
  // store fills them in on load (see lib/puzzleStore.ts → normalize).

  /** Stable identity that survives id / boxNumber renumbering. */
  uid?: string;
  /** Excluded from the playable set when false. Defaults to true. */
  active?: boolean;
  /** Position in the admin list. This is what assigns box numbers. */
  order?: number;
  /** Free-text grouping for admin filtering. Distinct from `categoryLabel`. */
  category?: string;
  difficulty?: PuzzleDifficulty;
  createdAt?: number;
  updatedAt?: number;

  // --- Type-specific payloads (only the relevant one is set) ---

  /** scramble: the jumbled letters. Must be a permutation of `answer`. */
  scrambledValue?: string;
  /** rebus / picture-word / picture-combo / emoji: the visual layout. */
  rows?: PuzzleRow[];
  /**
   * missing-letters: the answer with `_` for each blank,
   * e.g. "L E _ D E _ S H _ P".
   */
  maskedValue?: string;
  /** odd-one-out: the four options and the id of the one that doesn't belong. */
  choices?: PuzzleChoice[];
  oddOneOutId?: string;
  /**
   * connect: the three clues.
   * myth-fact: one entry, the statement. `answer` is then MYTH or FACT and
   * `insight` is the required explanation.
   */
  clues?: string[];

  /**
   * clickable: how the room answers. `answer` is the short answer shown after
   * submission and `insight` the required explanation.
   */
  interaction?: ClickInteraction;
  /** clickable: a line of context shown above the challenge, e.g. the situation to judge. */
  scenario?: string;
  /**
   * clickable: index into `imageAssets` of the scene photo. Hotspot and zoomed
   * challenges need one; choice and sequence cards may instead carry their own
   * photos through `assetIndex`.
   */
  sceneAsset?: number;
  /** clickable choice / sequence: the cards. A sequence lists them in the right order. */
  options?: ClickOption[];
  /** clickable hotspot: the things to find on the scene. */
  hotspots?: Hotspot[];
  /**
   * clickable: how many picks make a complete answer. choice defaults to 1;
   * hotspot defaults to one click per hotspot.
   */
  selectCount?: number;
  /**
   * clickable choice: the scene starts zoomed in and the facilitator zooms out
   * in three stages; the option cards appear after the last one.
   */
  sceneZoom?: boolean;
  /** clickable: the point the scene zooms in on, in percent. Defaults to the centre. */
  sceneFocus?: { x: number; y: number };

  // --- Events ---------------------------------------------------------
  /**
   * Which events this question belongs to (membership, not visibility — whether
   * it is Active is decided per event, see lib/events.ts). Used by the admin's
   * "filter by event".
   */
  events?: string[];
  /** Present on questions imported from the NAPE 2026 quiz document. */
  nape?: NapeMeta;
}

/** Why a question is flagged for a human before it is published. */
export type ReviewFlag =
  | "safety-sensitive"
  | "time-sensitive"
  | "needs-verification"
  | "wording-revised";

/**
 * Source-of-truth bookkeeping for a question imported from the supplied NAPE
 * document. `original` is the document's wording, kept verbatim even when the
 * live wording has been revised.
 */
export interface NapeMeta {
  set: number;
  /** The question's number in the source document (1–80). */
  sourceNumber: number;
  topic: string;
  format: "multiple-choice" | "true-false";
  original: {
    prompt: string;
    options: { label: string; correct: boolean }[];
    answer: string;
    funFact: string;
  };
  wording: "original" | "revised";
  flags: ReviewFlag[];
  /** Reviewer-facing explanation of the flags. Never shown to players. */
  note?: string;
  /** What kind of picture the question carries, for admin filtering. */
  visual?: "photo" | "diagram";
}

/**
 * A puzzle after the store has normalised it: every admin field is present.
 * Because it extends `Puzzle`, every existing `puzzle: Puzzle` prop accepts one
 * unchanged — no component had to be touched to support editing.
 */
export type ManagedPuzzle = Puzzle &
  Required<
    Pick<
      Puzzle,
      | "uid"
      | "active"
      | "order"
      | "category"
      | "difficulty"
      | "createdAt"
      | "updatedAt"
    >
  > & { imageAssets: string[] };

// --- Mascots ------------------------------------------------------------

export type MascotGender = "male" | "female";
export type MascotReaction = "correct" | "wrong";

export interface MascotClip {
  gender: MascotGender;
  reaction: MascotReaction;
  /** Video shown for the reaction. Always played MUTED. */
  videoFile: string | null;
  /** Approved ElevenLabs audio — the source of truth for the spoken line. */
  audioFile: string | null;
  dialogue: string;
  durationSec: number | null;
}

// --- Game state ---------------------------------------------------------

export type Screen = "boxes" | "opening" | "puzzle" | "results";

/**
 * Where the puzzle screen is in its facilitator-driven flow. A clickable
 * challenge goes from solving to "checking" (a short suspense beat after Submit)
 * and then straight to judged, because the clicks already decide the outcome.
 */
export type PuzzleStage = "solving" | "checking" | "revealed" | "judged";

export type Judgement = "correct" | "wrong" | "skipped";

export interface BoxOutcome {
  boxNumber: number;
  puzzleId: number;
  /** Stable puzzle identity — survives a renumber, unlike boxNumber/puzzleId. */
  puzzleUid?: string;
  categoryLabel: string;
  judgement: Judgement;
  at: number;
}

export interface GameState {
  openedBoxes: number[];
  outcomes: BoxOutcome[];
  correctCount: number;
  notQuiteCount: number;
  /** Alternates so consecutive reactions swap mascot. */
  nextMascot: MascotGender;
  startedAt: number | null;
  /**
   * Fingerprint of the question set this session was played against. If the
   * admin edits the bank mid-session the saved score would silently attach to
   * different puzzles, so a mismatch starts a clean session instead.
   */
  bankSignature?: string;
}

export interface GameSettings {
  timerEnabled: boolean;
  timerDuration: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  mascotEnabled: boolean;
  confettiEnabled: boolean;
  startingMascot: MascotGender;
  /**
   * How many active questions to put on the wall. 0 = all of them.
   * Capped by the number of active questions.
   */
  questionsPerSession: number;
  /**
   * Gate for /admin/questions. Empty string = no gate. This is obfuscation for
   * a shared facilitator laptop, NOT security — it lives in localStorage and is
   * readable in devtools. Replace with real auth before public deployment.
   */
  adminPin: string;
}
