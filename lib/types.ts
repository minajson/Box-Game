/**
 * CRACK THE BOX — shared types.
 *
 * Puzzle content lives in `data/puzzles.ts` and is intentionally decoupled from
 * the UI: components render whatever a puzzle's payload describes, and image
 * paths only ever come from `imageAssets`, never from a component.
 */

/** The nine supported puzzle types. (Wild Card was removed by request.) */
export type PuzzleType =
  | "rebus"
  | "scramble"
  | "picture-word"
  | "picture-combo"
  | "emoji"
  | "missing-letters"
  | "zoom"
  | "odd-one-out"
  | "connect";

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
  /** connect: the three clues. */
  clues?: string[];
}

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

/** Where the puzzle screen is in its facilitator-driven flow. */
export type PuzzleStage = "solving" | "revealed" | "judged";

export type Judgement = "correct" | "wrong" | "skipped";

export interface BoxOutcome {
  boxNumber: number;
  puzzleId: number;
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
}
