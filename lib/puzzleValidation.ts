import {
  PUZZLE_DIFFICULTIES,
  PUZZLE_TYPES,
  type ManagedPuzzle,
  type PuzzleChoice,
  type PuzzleDifficulty,
  type PuzzlePart,
  type PuzzleRow,
  type PuzzleType,
  type RevealAnimation,
} from "./types";

/**
 * QUESTION VALIDATION — one implementation, three callers.
 *
 * The admin form, the list's "problems" badge and the CSV importer all validate
 * through `validatePuzzle` here, so a rule can never be enforced in one place
 * and forgotten in another.
 *
 * WHY THIS EXISTS SEPARATELY FROM scripts/validate-puzzles.mjs
 * -----------------------------------------------------------
 * That script guards the BUNDLED SEED at build time and asserts three things
 * that are true of the seed but must never be true of an admin's bank:
 *
 *   - exactly 50 puzzles          - every box 1..50 assigned
 *   - all ten types used at least once
 *
 * Enforcing those here would make a twelve-question bank unsavable. Every OTHER
 * rule in that script is reproduced below, plus the crash rules that only matter
 * at runtime (see next paragraph). The divergence is deliberate; keep the two
 * files in step when a rule changes.
 *
 * TWO KINDS OF RULE
 * -----------------
 * Some rules exist because `components/PuzzleCanvas.tsx` would THROW or render
 * nothing — those carry `blocksPreview` and also gate the admin's live preview,
 * because a half-typed draft must not crash the editor:
 *
 *   - `puzzle.answer.replace(...)` / `.toUpperCase()` throw when answer is unset
 *   - `imageAssets[0]` is read unguarded for zoom
 *   - `key={choice.id}` and `key={clue}` break React on duplicates
 *   - `TEXT_SIZES[size]` silently yields `undefined` for an unknown size
 *
 * The rest are editorial: a scramble that is not a true permutation of its
 * answer still renders, but the reveal animation drops letters on stage.
 */

/* ---------------------------------------------------------------- types -- */

export type Severity = "error" | "warning";

export interface Issue {
  /** Dot path into the puzzle: "answer", "choices.2.label", "rows.0.parts.1.size". */
  field: string;
  message: string;
  severity: Severity;
  /** True when PuzzleCanvas would throw or render nothing for this puzzle. */
  blocksPreview?: boolean;
}

export interface ValidationResult {
  /** No errors. Warnings do not block saving. */
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  /** Safe to hand to PuzzleCanvas. */
  renderable: boolean;
}

export interface ValidateOptions {
  /** Everything else in the bank, for cross-question uniqueness checks. */
  bank: ManagedPuzzle[];
  /** Skip this uid when checking uniqueness (i.e. we are editing it). */
  ignoreUid?: string;
  /**
   * Asset paths known to exist. Given → a missing file is an error; omitted →
   * a warning, because the CSV importer cannot see the filesystem.
   */
  knownAssets?: string[];
}

/* ------------------------------------------------------------ type facts -- */

export const ROWS_TYPES: readonly PuzzleType[] = [
  "rebus",
  "picture-word",
  "picture-combo",
  "emoji",
];

export function usesRows(t: PuzzleType): boolean {
  return ROWS_TYPES.includes(t);
}

export const PART_SIZES = ["sm", "md", "lg", "xl"] as const;

export const REVEAL_ANIMATIONS: readonly RevealAnimation[] = [
  "rearrange",
  "fade",
  "combine",
  "fill-letters",
  "zoom-out",
  "highlight",
];

/** The reveal a new question of each type starts on. */
export const DEFAULT_REVEAL: Record<PuzzleType, RevealAnimation> = {
  scramble: "rearrange",
  rebus: "fade",
  "picture-word": "combine",
  "picture-combo": "combine",
  emoji: "fade",
  "missing-letters": "fill-letters",
  zoom: "zoom-out",
  "odd-one-out": "highlight",
  connect: "fade",
  "myth-fact": "highlight",
};

/**
 * The reveals that actually DO something for each type. Anything outside this
 * set still renders, but the signature animation is lost — worth a warning, not
 * an error.
 *
 * The four rows types accept both `fade` and `combine` because the difference is
 * real and content-dependent: `combine` collapses muted "+" connectors as the
 * clues slide together (PuzzleCanvas.tsx:313), which is right for a two-picture
 * combo and wrong for a rebus stack. The bundled seed uses both.
 */
const ALLOWED_REVEALS: Record<PuzzleType, readonly RevealAnimation[]> = {
  scramble: ["rearrange"],
  rebus: ["fade", "combine"],
  "picture-word": ["fade", "combine"],
  "picture-combo": ["fade", "combine"],
  emoji: ["fade", "combine"],
  "missing-letters": ["fill-letters"],
  zoom: ["zoom-out"],
  "odd-one-out": ["highlight"],
  connect: ["fade"],
  "myth-fact": ["highlight"],
};

/** The on-stage banner shown as the box bursts open. */
export const DEFAULT_CATEGORY_LABEL: Record<PuzzleType, string> = {
  scramble: "SCRAMBLE IT!",
  rebus: "REBUS!",
  "picture-word": "PICTURE THIS!",
  "picture-combo": "PUT IT TOGETHER!",
  emoji: "EMOJI DECODE!",
  "missing-letters": "FILL THE GAPS!",
  zoom: "ZOOM OUT!",
  "odd-one-out": "ODD ONE OUT!",
  connect: "WHAT CONNECTS THEM?",
  "myth-fact": "MYTH OR FACT?",
};

export const DEFAULT_PROMPT: Record<PuzzleType, string> = {
  scramble: "Unscramble this word",
  rebus: "What word or phrase is hiding here?",
  "picture-word": "Read the picture, then the word",
  "picture-combo": "Combine the pictures into one word",
  emoji: "Decode the emojis into one word",
  "missing-letters": "Fill in the missing letters",
  zoom: "What are you looking at?",
  "odd-one-out": "Which one does not belong?",
  connect: "What connects these three?",
  "myth-fact": "Is this statement a myth or a fact?",
};

export const TYPE_LABELS: Record<PuzzleType, string> = {
  scramble: "Word Scramble",
  rebus: "Rebus",
  "picture-word": "Picture + Word",
  "picture-combo": "Picture Combo",
  emoji: "Emoji Decode",
  "missing-letters": "Missing Letters",
  zoom: "Zoom Image",
  "odd-one-out": "Odd One Out",
  connect: "What Connects Them",
  "myth-fact": "Myth or Fact",
};

/** The only two answers a Myth or Fact question can have. */
export const MYTH_FACT_ANSWERS = ["MYTH", "FACT"] as const;

/* -------------------------------------------------------------- helpers -- */

/** "WROGHT" → "GHORTW". Letters only, uppercased, sorted. */
export function letterSignature(s: string): string {
  return (s ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .sort()
    .join("");
}

export function isPermutation(a: string, b: string): boolean {
  return letterSignature(a) === letterSignature(b);
}

/**
 * Shuffle `answer` into a jumble that is a guaranteed letter-for-letter
 * permutation. Non-letters (spaces, hyphens) stay where they are so a two-word
 * answer still reads as two words; the validator strips them anyway.
 */
export function autoScramble(answer: string): string {
  const source = (answer ?? "").toUpperCase();
  const letters = source.replace(/[^A-Z]/g, "").split("");
  if (letters.length < 2) return source;

  for (let attempt = 0; attempt < 24; attempt++) {
    // Fisher-Yates over a copy.
    const pool = [...letters];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let k = 0;
    const out = source.replace(/[A-Z]/g, () => pool[k++]);
    if (out !== source) return out;
  }

  // Every shuffle came back identical (e.g. "AAA") — swap the ends so the
  // result is at least different from the answer where that is possible.
  const pool = [...letters].reverse();
  let k = 0;
  return source.replace(/[A-Z]/g, () => pool[k++]);
}

/** The answer reduced to the characters that become mask slots. */
export function maskSlots(answer: string): string {
  return (answer ?? "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Build a `maskedValue` from the answer with the given (whitespace-stripped)
 * indexes blanked. Slots are space-separated purely for legibility — the canvas
 * strips whitespace before splitting.
 */
export function buildMask(answer: string, blankIndexes: number[]): string {
  const blanks = new Set(blankIndexes);
  return maskSlots(answer)
    .split("")
    .map((ch, i) => (blanks.has(i) ? "_" : ch))
    .join(" ");
}

/** Which slots a `maskedValue` currently blanks out. */
export function maskBlankIndexes(masked: string): number[] {
  const slots = (masked ?? "").replace(/\s+/g, "").split("");
  const out: number[] = [];
  slots.forEach((ch, i) => {
    if (ch === "_") out.push(i);
  });
  return out;
}

/** Sensible starting blanks: every third letter, or every vowel. */
export function suggestBlanks(
  answer: string,
  mode: "every3" | "vowels",
): number[] {
  const slots = maskSlots(answer).split("");
  const out: number[] = [];
  slots.forEach((ch, i) => {
    if (mode === "vowels" ? "AEIOU".includes(ch) : i % 3 === 2) out.push(i);
  });
  // Never blank everything — the room needs something to work from.
  return out.length >= slots.length ? out.slice(0, Math.max(1, slots.length - 1)) : out;
}

/**
 * Copy an object without one key.
 *
 * Storing `{assetIndex: undefined}` instead would look equivalent, but it is not:
 * `JSON.stringify` drops undefined values, so the key survives in memory and
 * vanishes on reload — a difference that shows up as "it worked until I
 * refreshed". Removing it outright keeps memory and storage identical.
 */
function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

/**
 * Drop `imageAssets[index]` and re-point every `assetIndex` that referred to a
 * later entry. Without the re-point, removing an image silently breaks every
 * clue after it — which the in-range rule would then report as the admin's fault.
 */
export function removeAsset(p: ManagedPuzzle, index: number): ManagedPuzzle {
  const imageAssets = p.imageAssets.filter((_, i) => i !== index);

  /** undefined = this reference pointed at the image we just removed. */
  const shift = (i: number): number | undefined => {
    if (i === index) return undefined;
    return i > index ? i - 1 : i;
  };

  const rows = p.rows?.map((row) => {
    if (!row.parts) return row;
    return {
      ...row,
      parts: row.parts.map((part) => {
        if (part.assetIndex === undefined) return part;
        const next = shift(part.assetIndex);
        return next === undefined
          ? omit(part, "assetIndex")
          : { ...part, assetIndex: next };
      }),
    };
  });

  const choices = p.choices?.map((choice) => {
    if (choice.assetIndex === undefined) return choice;
    const next = shift(choice.assetIndex);
    return next === undefined
      ? omit(choice, "assetIndex")
      : { ...choice, assetIndex: next };
  });

  return {
    ...p,
    imageAssets,
    ...(rows ? { rows } : {}),
    ...(choices ? { choices } : {}),
  };
}

/* ------------------------------------------------------------- validate -- */

const MAX_ANSWER = 60;
const MAX_HINT = 160;
const MAX_INSIGHT = 200;
const MAX_STATEMENT = 110;

function nonEmpty(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function validatePuzzle(
  draft: Partial<ManagedPuzzle>,
  opts: ValidateOptions,
): ValidationResult {
  const issues: Issue[] = [];
  const err = (field: string, message: string, blocksPreview = false) =>
    issues.push({ field, message, severity: "error", blocksPreview });
  const warn = (field: string, message: string) =>
    issues.push({ field, message, severity: "warning" });

  const others = opts.bank.filter((p) => p.uid !== opts.ignoreUid);

  /* -- type ------------------------------------------------------------- */
  const type = draft.type;
  if (!type || !PUZZLE_TYPES.includes(type)) {
    err("type", "Choose a question type.", true);
    // Every type-specific rule below depends on knowing the type.
    return finish(issues);
  }

  /* -- universal text --------------------------------------------------- */
  if (!nonEmpty(draft.answer)) {
    // PuzzleCanvas.tsx:69 and :112 call methods on answer with no guard.
    err("answer", "An answer is required.", true);
  } else if (draft.answer!.trim().length > MAX_ANSWER) {
    warn("answer", `Long answers are hard to read on a projector (over ${MAX_ANSWER} characters).`);
  }

  if (!nonEmpty(draft.prompt)) err("prompt", "A prompt is required — it is shown above the puzzle.");
  if (!nonEmpty(draft.hint)) err("hint", "A hint is required.");
  else if (draft.hint!.trim().length > MAX_HINT) {
    warn("hint", `Hints over ${MAX_HINT} characters get cramped on screen.`);
  }
  if (!nonEmpty(draft.categoryLabel)) {
    err("categoryLabel", "A reveal label is required — it is the banner shown as the box opens.");
  }
  if (!nonEmpty(draft.category)) warn("category", "No category set — it will be filed under General.");
  if (draft.insight && draft.insight.trim().length > MAX_INSIGHT) {
    warn("insight", `Insights over ${MAX_INSIGHT} characters are too long to read out.`);
  }

  /* -- enums ------------------------------------------------------------ */
  if (draft.difficulty && !PUZZLE_DIFFICULTIES.includes(draft.difficulty as PuzzleDifficulty)) {
    err("difficulty", "Difficulty must be easy, medium or hard.");
  }
  if (!draft.revealAnimation || !REVEAL_ANIMATIONS.includes(draft.revealAnimation)) {
    err("revealAnimation", "Choose a reveal animation.");
  } else if (!ALLOWED_REVEALS[type].includes(draft.revealAnimation)) {
    const allowed = ALLOWED_REVEALS[type].map((r) => `"${r}"`).join(" or ");
    warn(
      "revealAnimation",
      `${TYPE_LABELS[type]} questions animate with ${allowed} — "${draft.revealAnimation}" renders but loses the reveal.`,
    );
  }

  /* -- identity --------------------------------------------------------- */
  // saveBank() drops entries that collide on uid or id and still reports
  // success, so a collision here would lose the question with no error.
  if (!nonEmpty(draft.uid)) err("uid", "Missing internal id. Reload the admin and try again.");
  else if (others.some((p) => p.uid === draft.uid)) {
    err("uid", "Another question already uses this internal id.");
  }
  if (typeof draft.id !== "number" || !Number.isInteger(draft.id) || draft.id < 1) {
    err("id", "Missing internal number. Reload the admin and try again.");
  } else if (others.some((p) => p.id === draft.id)) {
    err("id", "Another question already uses this internal number.");
  }

  // Two boxes revealing the same answer is obvious from the floor. Myth or Fact
  // is the exception: its answer is always one of two words, so its STATEMENT is
  // what must not repeat (checked in its own case below).
  if (nonEmpty(draft.answer) && type !== "myth-fact") {
    const mine = draft.answer!.trim().toUpperCase();
    const clash = others.find(
      (p) => p.type !== "myth-fact" && (p.answer ?? "").trim().toUpperCase() === mine,
    );
    if (clash) {
      err("answer", `Question ${clash.order + 1} already uses the answer "${clash.answer}".`);
    }
  }

  if ("challenge" in (draft as Record<string, unknown>)) {
    err("challenge", "The Wild Card field was removed. Delete it from this question.");
  }

  /* -- images ----------------------------------------------------------- */
  const assets = Array.isArray(draft.imageAssets) ? draft.imageAssets : [];
  assets.forEach((path, i) => {
    if (!nonEmpty(path)) {
      err(`imageAssets.${i}`, "Empty image path.", true);
      return;
    }
    if (!path.startsWith("/") && !path.startsWith("data:")) {
      err(
        `imageAssets.${i}`,
        'Image paths must start with "/" (a file in public/) or be an uploaded image.',
        true,
      );
      return;
    }
    if (opts.knownAssets && !path.startsWith("data:") && !opts.knownAssets.includes(path)) {
      err(`imageAssets.${i}`, `No file at public${path} in this build.`, true);
    } else if (!opts.knownAssets && !path.startsWith("data:")) {
      warn(`imageAssets.${i}`, "Image path not verified — check it appears in the preview.");
    }
  });

  const assetInRange = (i: number | undefined): boolean =>
    i !== undefined && Number.isInteger(i) && i >= 0 && i < assets.length;

  /* -- per type --------------------------------------------------------- */
  switch (type) {
    case "scramble": {
      if (!nonEmpty(draft.scrambledValue)) {
        err("scrambledValue", "Enter the jumbled letters.", true);
        break;
      }
      const scrambled = draft.scrambledValue!;
      if (nonEmpty(draft.answer)) {
        if (!isPermutation(scrambled, draft.answer!)) {
          err(
            "scrambledValue",
            "The jumble must use exactly the letters of the answer — no more, no fewer. Use Shuffle to fix it.",
            true,
          );
        }
        if (scrambled.trim().toUpperCase() === draft.answer!.trim().toUpperCase()) {
          err("scrambledValue", "The jumble is the answer. Shuffle it.");
        }
      }
      break;
    }

    case "missing-letters": {
      if (!nonEmpty(draft.maskedValue)) {
        err("maskedValue", "Build the masked answer.", true);
        break;
      }
      const slots = draft.maskedValue!.replace(/\s+/g, "").split("");
      const answerSlots = maskSlots(draft.answer ?? "").split("");

      if (nonEmpty(draft.answer) && slots.length !== answerSlots.length) {
        err(
          "maskedValue",
          `The mask has ${slots.length} slot${slots.length === 1 ? "" : "s"} but the answer has ${answerSlots.length} letter${answerSlots.length === 1 ? "" : "s"}.`,
          true,
        );
        break;
      }
      const blanks = slots.filter((c) => c === "_").length;
      if (blanks === 0) {
        err("maskedValue", "Blank at least one letter with _ — otherwise the answer is already on screen.");
      }
      if (nonEmpty(draft.answer)) {
        const mismatch = slots.findIndex(
          (c, i) => c !== "_" && c.toUpperCase() !== answerSlots[i],
        );
        if (mismatch !== -1) {
          err(
            "maskedValue",
            `Slot ${mismatch + 1} shows "${slots[mismatch]}" but the answer has "${answerSlots[mismatch]}" there.`,
          );
        }
      }
      if (slots.length > 0 && blanks / slots.length > 0.6) {
        warn("maskedValue", "Over 60% of the letters are blank — this may be unsolvable in a room.");
      }
      break;
    }

    case "odd-one-out": {
      const choices: PuzzleChoice[] = Array.isArray(draft.choices) ? draft.choices : [];
      if (choices.length !== 4) {
        // The canvas grid is grid-cols-2 lg:grid-cols-4.
        err("choices", `Odd One Out needs exactly 4 options — there ${choices.length === 1 ? "is" : "are"} ${choices.length}.`, true);
      }

      const seen = new Set<string>();
      choices.forEach((choice, i) => {
        if (!nonEmpty(choice?.id)) {
          // PuzzleCanvas.tsx:220 uses choice.id as the React key.
          err(`choices.${i}.id`, "Missing internal option id.", true);
        } else if (seen.has(choice.id)) {
          err(`choices.${i}.id`, "Two options share the same internal id.", true);
        } else {
          seen.add(choice.id);
        }

        if (!nonEmpty(choice?.label)) err(`choices.${i}.label`, "Every option needs a label.");

        if (!nonEmpty(choice?.emoji) && !assetInRange(choice?.assetIndex)) {
          err(
            `choices.${i}.emoji`,
            "Every option needs an emoji or an image, or the card renders empty.",
          );
        }
      });

      if (!nonEmpty(draft.oddOneOutId)) {
        err("oddOneOutId", "Mark which option is the odd one out.", true);
      } else {
        const odd = choices.find((c) => c.id === draft.oddOneOutId);
        if (!odd) {
          err("oddOneOutId", "The odd one out points at an option that no longer exists.", true);
        } else if (
          nonEmpty(draft.answer) &&
          (odd.label ?? "").trim().toUpperCase() !== draft.answer!.trim().toUpperCase()
        ) {
          err(
            "answer",
            `The answer must match the odd option's label ("${odd.label}") — that is what the reveal highlights.`,
          );
        }
      }
      break;
    }

    case "connect": {
      const clues: string[] = Array.isArray(draft.clues) ? draft.clues : [];
      if (clues.length !== 3) {
        err("clues", `What Connects Them needs exactly 3 clues — there ${clues.length === 1 ? "is" : "are"} ${clues.length}.`, true);
      }
      clues.forEach((clue, i) => {
        if (!nonEmpty(clue)) err(`clues.${i}`, "Clues cannot be empty.", true);
      });
      // PuzzleCanvas.tsx:273 uses the clue text as the React key.
      const lower = clues.map((c) => (c ?? "").trim().toLowerCase());
      const dupe = lower.findIndex((c, i) => c && lower.indexOf(c) !== i);
      if (dupe !== -1) err(`clues.${dupe}`, "Each clue must be different.", true);
      break;
    }

    case "myth-fact": {
      const clues: string[] = Array.isArray(draft.clues) ? draft.clues : [];
      const statement = clues[0] ?? "";
      if (clues.length !== 1 || !nonEmpty(statement)) {
        err("clues.0", "Enter the statement the room will judge.", true);
      } else {
        if (statement.trim().length > MAX_STATEMENT) {
          warn("clues.0", `Statements over ${MAX_STATEMENT} characters are hard to read from the back of a room.`);
        }
        const mine = statement.trim().toLowerCase();
        const clash = others.find(
          (p) => p.type === "myth-fact" && (p.clues?.[0] ?? "").trim().toLowerCase() === mine,
        );
        if (clash) err("clues.0", `Question ${clash.order + 1} already uses this statement.`);
      }
      if (nonEmpty(draft.answer) && !(MYTH_FACT_ANSWERS as readonly string[]).includes(draft.answer!.trim().toUpperCase())) {
        err("answer", "The answer must be MYTH or FACT.", true);
      }
      if (!nonEmpty(draft.insight)) {
        err("insight", "An explanation is required — it is what the room learns on the reveal.");
      }
      break;
    }

    case "zoom": {
      // PuzzleCanvas.tsx:166 reads imageAssets[0] with no guard.
      if (assets.length === 0) err("imageAssets", "Choose an image to zoom into.", true);
      break;
    }

    default: {
      // rebus / picture-word / picture-combo / emoji
      const rows: PuzzleRow[] = Array.isArray(draft.rows) ? draft.rows : [];
      if (rows.length === 0) {
        err("rows", "Add at least one row of clues.", true);
        break;
      }
      if (rows.every((r) => r.divider)) {
        err("rows", "Every row is a divider — there is nothing to solve.", true);
      }

      rows.forEach((row, r) => {
        const parts: PuzzlePart[] = Array.isArray(row.parts) ? row.parts : [];

        if (row.divider) {
          if (parts.length > 0) {
            // The canvas checks `divider` first and never renders the parts.
            err(`rows.${r}`, "A divider row cannot also hold clues — split it into two rows.");
          }
          return;
        }
        if (parts.length === 0) {
          err(`rows.${r}.parts`, "This row is empty. Add a clue or make it a divider.");
          return;
        }

        parts.forEach((part, i) => {
          const path = `rows.${r}.parts.${i}`;
          const hasVisible =
            nonEmpty(part?.text) ||
            nonEmpty(part?.emoji) ||
            part?.assetIndex !== undefined ||
            part?.boxed === true;
          if (!hasVisible) {
            err(path, "This clue is blank — give it text, an emoji, an image, or make it an empty box.");
          }

          if (part?.assetIndex !== undefined && !assetInRange(part.assetIndex)) {
            err(
              `${path}.assetIndex`,
              assets.length === 0
                ? "This clue points at an image but the question has none."
                : `Image ${part.assetIndex + 1} does not exist — the question has ${assets.length}.`,
              true,
            );
          }

          if (
            part?.size !== undefined &&
            !PART_SIZES.includes(part.size as (typeof PART_SIZES)[number])
          ) {
            // TEXT_SIZES[size] → undefined, so it renders at inherited size.
            err(`${path}.size`, "Size must be sm, md, lg or xl.", true);
          }

          if (part?.rotate !== undefined) {
            if (!Number.isFinite(part.rotate) || Math.abs(part.rotate) > 180) {
              err(`${path}.rotate`, "Rotation must be a number between -180 and 180.");
            }
          }

          if (part?.text === "+" && !part?.muted) {
            warn(
              `${path}.text`,
              'A "+" between clues should be marked as a connector, or it renders at full clue size.',
            );
          }
        });
      });

      if (assets.length > 0) {
        const used = new Set<number>();
        rows.forEach((row) =>
          row.parts?.forEach((part) => {
            if (part.assetIndex !== undefined) used.add(part.assetIndex);
          }),
        );
        assets.forEach((_, i) => {
          if (!used.has(i)) {
            warn(`imageAssets.${i}`, "This image is not used by any clue.");
          }
        });
      }
      break;
    }
  }

  /* -- payloads that belong to another type ----------------------------- */
  const strays: Array<[keyof ManagedPuzzle, PuzzleType[]]> = [
    ["scrambledValue", ["scramble"]],
    ["maskedValue", ["missing-letters"]],
    ["choices", ["odd-one-out"]],
    ["oddOneOutId", ["odd-one-out"]],
    ["clues", ["connect", "myth-fact"]],
    ["rows", [...ROWS_TYPES]],
  ];
  for (const [field, owners] of strays) {
    const value = draft[field];
    const present = Array.isArray(value) ? value.length > 0 : nonEmpty(value as string);
    if (present && !owners.includes(type)) {
      warn(
        field as string,
        `Left over from another question type — ignored by ${TYPE_LABELS[type]}.`,
      );
    }
  }

  return finish(issues);
}

function finish(issues: Issue[]): ValidationResult {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    renderable: !errors.some((i) => i.blocksPreview),
  };
}

/**
 * Validate a whole bank in one pass. Each question is checked against all the
 * others, so a duplicate answer is reported on both.
 */
export function validateBank(
  bank: ManagedPuzzle[],
  knownAssets?: string[],
): Map<string, ValidationResult> {
  const out = new Map<string, ValidationResult>();
  for (const p of bank) {
    out.set(p.uid, validatePuzzle(p, { bank, ignoreUid: p.uid, knownAssets }));
  }
  return out;
}

/** How many questions in the bank have at least one error. */
export function problemCount(results: Map<string, ValidationResult>): number {
  let n = 0;
  results.forEach((r) => {
    if (!r.ok) n++;
  });
  return n;
}
