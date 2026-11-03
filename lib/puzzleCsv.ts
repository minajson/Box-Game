import { parseCsv, toCsv } from "./csv";
import { newUid, nextId } from "./puzzleStore";
import { DEFAULT_REVEAL, validatePuzzle, type Issue } from "./puzzleValidation";
import {
  PUZZLE_DIFFICULTIES,
  PUZZLE_TYPES,
  type ManagedPuzzle,
  type PuzzleChoice,
  type PuzzleDifficulty,
  type PuzzleRow,
  type PuzzleType,
  type RevealAnimation,
} from "./types";

/**
 * CSV and JSON interchange for the question bank.
 *
 * WHY THE NESTED COLUMNS HOLD JSON
 * --------------------------------
 * `rows`, `choices`, `clues` and `clickable` are arbitrarily deep: a rebus row holds any
 * number of parts, and a part has ten optional keys. Flattening that into
 * `row1_part1_text`-style columns either caps the shape (a four-part row breaks a
 * three-column layout) or invents a second escaping grammar for the separators —
 * which then has to survive a prompt that itself contains a semicolon.
 *
 * One JSON string per column means exactly ONE escaping layer, and it is the
 * layer CSV already provides: quoting handles the commas, quotes and newlines
 * inside the JSON. It also round-trips byte-for-byte, which is the property that
 * makes "export, edit two rows in Excel, re-import" safe.
 *
 * `boxNumber` is deliberately NOT a column. It is derived at runtime from the
 * active questions in `order`, so exporting it would invite an admin to "fix" a
 * number the game recomputes and ignores.
 */

/* --------------------------------------------------------------- columns -- */

export const CSV_COLUMNS = [
  "uid",
  "id",
  "order",
  "active",
  "type",
  "category",
  "categoryLabel",
  "difficulty",
  "prompt",
  "answer",
  "hint",
  "insight",
  "revealAnimation",
  "scrambledValue",
  "maskedValue",
  "oddOneOutId",
  "imageAssets",
  "rows",
  "choices",
  "clues",
  "clickable",
  "createdAt",
  "updatedAt",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Without these the row cannot describe a question at all. */
export const CSV_REQUIRED: CsvColumn[] = [
  "type",
  "categoryLabel",
  "prompt",
  "answer",
  "hint",
];

/** One-line description per column, for the in-app reference table. */
export const CSV_COLUMN_HELP: Record<CsvColumn, string> = {
  uid: "Internal id. Leave blank when adding; keep it to update an existing question.",
  id: "Internal number. Leave blank and one is assigned.",
  order: "Position in the list, starting at 1. Blank appends to the end.",
  active: "true or false. Blank means true.",
  type: `One of: ${PUZZLE_TYPES.join(", ")}.`,
  category: "Your own grouping, for filtering. Blank becomes General.",
  categoryLabel: "The banner shown as the box bursts open, e.g. SCRAMBLE IT!",
  difficulty: "easy, medium or hard. Blank means medium.",
  prompt: "The instruction shown above the puzzle.",
  answer: "What the facilitator reveals. Must be unique across the bank, except Myth or Fact, where it is MYTH or FACT.",
  hint: "Shown when the facilitator asks for a hint.",
  insight: "Optional line to read out after the reveal. Required for Myth or Fact and Clickable Challenge, where it is the explanation.",
  revealAnimation:
    "rearrange, fade, combine, fill-letters, zoom-out or highlight. Blank picks the one for the type.",
  scrambledValue: "Word Scramble only: the jumbled letters of the answer.",
  maskedValue: "Missing Letters only: the answer with _ for each blank.",
  oddOneOutId: "Odd One Out only: the id of the option that does not belong.",
  imageAssets: 'JSON array of paths, e.g. ["/media/puzzles/zoom-key.svg"]. Also accepts paths separated by |.',
  rows: 'Rebus / Picture / Emoji only: JSON, e.g. [{"parts":[{"text":"STAND","size":"xl"}]},{"divider":true}]',
  choices: 'Odd One Out only: JSON, e.g. [{"id":"a","label":"LISTENING","emoji":"👂"}]',
  clues: 'What Connects Them: JSON array of 3 strings. Myth or Fact: JSON array holding the 1 statement.',
  clickable:
    'Clickable Challenge only: JSON with "interaction" (choice, hotspot or sequence) plus "options" or "hotspots", and optionally "scenario", "sceneAsset", "sceneZoom", "sceneFocus", "selectCount".',
  createdAt: "ISO date. Blank means now.",
  updatedAt: "ISO date. Rewritten on every save.",
};

/* ---------------------------------------------------------------- export -- */

function isoOrBlank(ms: number | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
  return new Date(ms).toISOString();
}

/** Stable key order, so re-exporting an unchanged bank gives an identical file. */
function stableJson(value: unknown): string {
  if (value === undefined) return "";
  return JSON.stringify(value, (_k, v) => v);
}

export function puzzleToCsvRow(p: ManagedPuzzle): string[] {
  const cell: Record<CsvColumn, string> = {
    uid: p.uid,
    id: String(p.id),
    order: String(p.order + 1),
    active: p.active ? "true" : "false",
    type: p.type,
    category: p.category,
    categoryLabel: p.categoryLabel,
    difficulty: p.difficulty,
    prompt: p.prompt,
    answer: p.answer,
    hint: p.hint,
    insight: p.insight ?? "",
    revealAnimation: p.revealAnimation,
    scrambledValue: p.scrambledValue ?? "",
    maskedValue: p.maskedValue ?? "",
    oddOneOutId: p.oddOneOutId ?? "",
    imageAssets: p.imageAssets.length ? stableJson(p.imageAssets) : "",
    rows: p.rows?.length ? stableJson(p.rows) : "",
    choices: p.choices?.length ? stableJson(p.choices) : "",
    clues: p.clues?.length ? stableJson(p.clues) : "",
    clickable: p.type === "clickable" ? stableJson(clickablePayload(p)) : "",
    createdAt: isoOrBlank(p.createdAt),
    updatedAt: isoOrBlank(p.updatedAt),
  };
  return CSV_COLUMNS.map((c) => cell[c]);
}

/** The clickable-only fields, gathered into the one `clickable` column. */
const CLICKABLE_KEYS = [
  "interaction",
  "scenario",
  "sceneAsset",
  "sceneZoom",
  "sceneFocus",
  "options",
  "hotspots",
  "selectCount",
] as const satisfies readonly (keyof ManagedPuzzle)[];

function clickablePayload(p: ManagedPuzzle): Partial<ManagedPuzzle> {
  const out: Partial<Record<(typeof CLICKABLE_KEYS)[number], unknown>> = {};
  for (const k of CLICKABLE_KEYS) if (p[k] !== undefined) out[k] = p[k];
  return out as Partial<ManagedPuzzle>;
}

export function exportPuzzlesCsv(list: ManagedPuzzle[]): string {
  const ordered = [...list].sort((a, b) => a.order - b.order);
  return toCsv([[...CSV_COLUMNS], ...ordered.map(puzzleToCsvRow)], { bom: true });
}

/** Header plus three worked examples covering the awkward column shapes. */
export function csvTemplate(): string {
  const rows: string[][] = [
    [...CSV_COLUMNS],
    blankTemplateRow({
      type: "scramble",
      categoryLabel: "SCRAMBLE IT!",
      prompt: "Unscramble this word",
      answer: "GROWTH",
      hint: "The whole point of stepping outside your comfort zone.",
      insight: "Nobody ever grew inside their comfort zone.",
      revealAnimation: "rearrange",
      scrambledValue: "WROGHT",
      category: "Scramble",
      difficulty: "easy",
    }),
    blankTemplateRow({
      type: "rebus",
      categoryLabel: "REBUS!",
      prompt: "What word or phrase is hiding here?",
      answer: "I UNDERSTAND",
      hint: "One word is sitting UNDER the other one.",
      revealAnimation: "fade",
      category: "Rebus",
      difficulty: "medium",
      rows: JSON.stringify([
        { parts: [{ text: "STAND", size: "xl" }] },
        { divider: true },
        { parts: [{ text: "I", size: "xl" }] },
      ]),
    }),
    blankTemplateRow({
      type: "odd-one-out",
      categoryLabel: "ODD ONE OUT!",
      prompt: "Which one does not belong?",
      answer: "INTERRUPTING",
      hint: "Three of these help a conversation. One ends it.",
      revealAnimation: "highlight",
      category: "Listening",
      difficulty: "medium",
      oddOneOutId: "c",
      choices: JSON.stringify([
        { id: "a", label: "LISTENING", emoji: "👂" },
        { id: "b", label: "ASKING", emoji: "🙋" },
        { id: "c", label: "INTERRUPTING", emoji: "✋" },
        { id: "d", label: "SUMMARISING", emoji: "📝" },
      ]),
    }),
  ];
  return toCsv(rows, { bom: true });
}

function blankTemplateRow(values: Partial<Record<CsvColumn, string>>): string[] {
  return CSV_COLUMNS.map((c) => values[c] ?? "");
}

/* ---------------------------------------------------------------- import -- */

export type ImportMode = "add-only" | "update-existing" | "replace-all";

export interface RowReport {
  /** 1-based line in the file. The header is line 1. */
  line: number;
  uid?: string;
  answer?: string;
  status: "imported" | "updated" | "skipped" | "error";
  reason?: string;
  issues: Issue[];
}

export interface ImportReport {
  /** Non-empty means NOTHING was imported and the bank is untouched. */
  fileErrors: string[];
  /** Unrecognised columns — ignored, but worth telling the admin about. */
  unknownColumns: string[];
  rows: RowReport[];
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  /** The bank to save. Undefined when fileErrors is non-empty. */
  nextBank?: ManagedPuzzle[];
}

const TRUE_WORDS = new Set(["true", "1", "yes", "y", "on"]);
const FALSE_WORDS = new Set(["false", "0", "no", "n", "off"]);

function parseBool(raw: string, fallback: boolean): boolean {
  const v = raw.trim().toLowerCase();
  if (v === "") return fallback;
  if (TRUE_WORDS.has(v)) return true;
  if (FALSE_WORDS.has(v)) return false;
  return fallback;
}

function parseTime(raw: string, fallback: number): number {
  const v = raw.trim();
  if (!v) return fallback;
  // Accept both an ISO string and raw epoch milliseconds.
  if (/^\d+$/.test(v)) return Number(v);
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : fallback;
}

/** Parse a JSON column, reporting the failure rather than throwing. */
function parseJsonCell<T>(
  raw: string,
  field: string,
  issues: Issue[],
): T | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  try {
    return JSON.parse(v) as T;
  } catch {
    issues.push({
      field,
      message: `Not valid JSON. Copy the shape from the template, or leave it blank.`,
      severity: "error",
    });
    return undefined;
  }
}

function parseAssets(raw: string, issues: Issue[]): string[] {
  const v = raw.trim();
  if (!v) return [];
  // A hand-typed pipe list is far easier than JSON for the common one-image case.
  if (!v.startsWith("[")) {
    return v
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const parsed = parseJsonCell<unknown>(v, "imageAssets", issues);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is string => typeof x === "string");
}

export function importPuzzlesCsv(
  text: string,
  bank: ManagedPuzzle[],
  mode: ImportMode,
  knownAssets?: string[],
): ImportReport {
  const report: ImportReport = {
    fileErrors: [],
    unknownColumns: [],
    rows: [],
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  const table = parseCsv(text).filter((row) => row.some((c) => c.trim() !== ""));
  if (table.length === 0) {
    report.fileErrors.push("That file is empty.");
    return report;
  }

  const header = table[0].map((h) => h.trim());
  const index = new Map<string, number>();
  header.forEach((name, i) => {
    if ((CSV_COLUMNS as readonly string[]).includes(name)) index.set(name, i);
    else if (name) report.unknownColumns.push(name);
  });

  const missing = CSV_REQUIRED.filter((c) => !index.has(c));
  if (missing.length > 0) {
    report.fileErrors.push(
      `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Download the template to see the expected header.`,
    );
    return report;
  }
  if (table.length === 1) {
    report.fileErrors.push("That file has a header but no question rows.");
    return report;
  }

  const get = (row: string[], col: CsvColumn): string => {
    const at = index.get(col);
    return at === undefined ? "" : (row[at] ?? "");
  };

  // `projected` grows as rows are accepted, so an in-file duplicate answer on
  // line 40 is caught against the row that claimed it on line 12.
  const projected: ManagedPuzzle[] = mode === "replace-all" ? [] : [...bank];

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const line = r + 1;
    const issues: Issue[] = [];

    const rawType = get(row, "type").trim();
    const type = (PUZZLE_TYPES as readonly string[]).includes(rawType)
      ? (rawType as PuzzleType)
      : undefined;
    if (!type) {
      issues.push({
        field: "type",
        message: `"${rawType}" is not a question type. Use one of: ${PUZZLE_TYPES.join(", ")}.`,
        severity: "error",
      });
    }

    const rawDifficulty = get(row, "difficulty").trim().toLowerCase();
    const difficulty = (PUZZLE_DIFFICULTIES as readonly string[]).includes(rawDifficulty)
      ? (rawDifficulty as PuzzleDifficulty)
      : "medium";
    if (rawDifficulty && difficulty !== rawDifficulty) {
      issues.push({
        field: "difficulty",
        message: `"${rawDifficulty}" is not a difficulty. Use easy, medium or hard.`,
        severity: "error",
      });
    }

    const csvUid = get(row, "uid").trim();
    const existingAt = csvUid
      ? projected.findIndex((p) => p.uid === csvUid)
      : -1;

    // add-only NEVER reuses an incoming uid: saveBank() silently drops
    // collisions and reports success, so a re-imported export would lose rows.
    const isUpdate = mode === "update-existing" && existingAt !== -1;
    if (mode === "add-only" && existingAt !== -1) {
      report.rows.push({
        line,
        uid: csvUid,
        answer: get(row, "answer").trim(),
        status: "skipped",
        reason:
          'A question with this uid already exists. Choose "Update existing questions" to overwrite it.',
        issues: [],
      });
      report.skipped++;
      continue;
    }

    const existing = isUpdate ? projected[existingAt] : undefined;
    const now = Date.now();

    const rawOrder = Number(get(row, "order").trim());
    const order = Number.isFinite(rawOrder) && rawOrder >= 1
      ? Math.round(rawOrder) - 1
      : existing?.order ?? projected.length;

    const rawId = Number(get(row, "id").trim());
    const idWanted =
      Number.isInteger(rawId) && rawId >= 1 ? rawId : existing?.id;
    const idFree =
      idWanted !== undefined &&
      !projected.some((p) => p.id === idWanted && p.uid !== existing?.uid);

    const draft: ManagedPuzzle = {
      uid: isUpdate ? existing!.uid : csvUid && mode !== "add-only" ? csvUid : newUid(),
      id: idFree ? idWanted! : nextId(projected),
      boxNumber: order + 1,
      order,
      active: parseBool(get(row, "active"), existing?.active ?? true),
      type: (type ?? "scramble") as PuzzleType,
      category: get(row, "category").trim() || "General",
      categoryLabel: get(row, "categoryLabel").trim(),
      difficulty,
      prompt: get(row, "prompt").trim(),
      answer: get(row, "answer").trim(),
      hint: get(row, "hint").trim(),
      insight: get(row, "insight").trim() || undefined,
      revealAnimation:
        (get(row, "revealAnimation").trim() as RevealAnimation) ||
        DEFAULT_REVEAL[(type ?? "scramble") as PuzzleType],
      imageAssets: parseAssets(get(row, "imageAssets"), issues),
      createdAt: parseTime(get(row, "createdAt"), existing?.createdAt ?? now),
      updatedAt: now,
    };

    const scrambled = get(row, "scrambledValue").trim();
    if (scrambled) draft.scrambledValue = scrambled;
    const masked = get(row, "maskedValue").trim();
    if (masked) draft.maskedValue = masked;
    const oddId = get(row, "oddOneOutId").trim();
    if (oddId) draft.oddOneOutId = oddId;

    const rows = parseJsonCell<PuzzleRow[]>(get(row, "rows"), "rows", issues);
    if (rows !== undefined) {
      if (Array.isArray(rows)) draft.rows = rows;
      else issues.push({ field: "rows", message: "Must be a JSON array of rows.", severity: "error" });
    }
    const choices = parseJsonCell<PuzzleChoice[]>(get(row, "choices"), "choices", issues);
    if (choices !== undefined) {
      if (Array.isArray(choices)) draft.choices = choices;
      else issues.push({ field: "choices", message: "Must be a JSON array of options.", severity: "error" });
    }
    const clues = parseJsonCell<string[]>(get(row, "clues"), "clues", issues);
    if (clues !== undefined) {
      if (Array.isArray(clues)) draft.clues = clues.map((c) => String(c));
      else issues.push({ field: "clues", message: "Must be a JSON array of clues.", severity: "error" });
    }
    const clickable = parseJsonCell<Record<string, unknown>>(get(row, "clickable"), "clickable", issues);
    if (clickable !== undefined) {
      if (clickable && typeof clickable === "object" && !Array.isArray(clickable)) {
        for (const k of CLICKABLE_KEYS) {
          if (clickable[k] !== undefined) (draft as unknown as Record<string, unknown>)[k] = clickable[k];
        }
      } else {
        issues.push({ field: "clickable", message: "Must be a JSON object.", severity: "error" });
      }
    }

    // The same validator the form uses — one rulebook, not two.
    const result = validatePuzzle(draft, {
      bank: projected,
      ignoreUid: isUpdate ? draft.uid : undefined,
      knownAssets,
    });
    const allIssues = [...issues, ...result.errors];

    if (allIssues.length > 0) {
      report.rows.push({
        line,
        uid: draft.uid,
        answer: draft.answer,
        status: "error",
        issues: allIssues,
      });
      report.failed++;
      continue;
    }

    if (isUpdate) {
      projected[existingAt] = draft;
      report.updated++;
      report.rows.push({ line, uid: draft.uid, answer: draft.answer, status: "updated", issues: [] });
    } else {
      projected.push(draft);
      report.imported++;
      report.rows.push({ line, uid: draft.uid, answer: draft.answer, status: "imported", issues: [] });
    }
  }

  // Re-sequence densely: imported rows may have claimed sparse or duplicate
  // order numbers, and the wall reads position, not the stored integer.
  report.nextBank = [...projected]
    .sort((a, b) => a.order - b.order)
    .map((p, i) => ({ ...p, order: i }));

  return report;
}

/** The rejected rows, as a CSV the admin can fix and re-import. */
export function rejectedRowsCsv(text: string, report: ImportReport): string {
  const table = parseCsv(text).filter((row) => row.some((c) => c.trim() !== ""));
  if (table.length === 0) return "";
  const bad = new Set(
    report.rows.filter((r) => r.status === "error").map((r) => r.line),
  );
  const reasons = new Map(
    report.rows
      .filter((r) => r.status === "error")
      .map((r) => [r.line, r.issues.map((i) => `${i.field}: ${i.message}`).join(" | ")]),
  );

  const out: string[][] = [[...table[0], "importError"]];
  for (let r = 1; r < table.length; r++) {
    const line = r + 1;
    if (bad.has(line)) out.push([...table[r], reasons.get(line) ?? ""]);
  }
  return toCsv(out, { bom: true });
}

/* ------------------------------------------------------------------ JSON -- */

/**
 * Lossless backup. CSV is the interchange format for spreadsheet work; this is
 * the one to use when moving a bank between machines, because it needs no
 * coercion at all.
 */
export function exportBankJson(list: ManagedPuzzle[]): string {
  const ordered = [...list].sort((a, b) => a.order - b.order);
  return `${JSON.stringify(
    {
      format: "crack-the-box/questions",
      version: 1,
      exportedAt: new Date().toISOString(),
      count: ordered.length,
      questions: ordered,
    },
    null,
    2,
  )}\n`;
}

export function importBankJson(
  text: string,
  bank: ManagedPuzzle[],
  mode: ImportMode,
  knownAssets?: string[],
): ImportReport {
  const report: ImportReport = {
    fileErrors: [],
    unknownColumns: [],
    rows: [],
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    report.fileErrors.push("That file is not valid JSON.");
    return report;
  }

  const questions = Array.isArray(parsed)
    ? parsed
    : (parsed as { questions?: unknown })?.questions;

  if (!Array.isArray(questions)) {
    report.fileErrors.push(
      'Expected a backup file with a "questions" array. Use a file exported from this admin.',
    );
    return report;
  }
  if (questions.length === 0) {
    report.fileErrors.push("That backup contains no questions.");
    return report;
  }

  const projected: ManagedPuzzle[] = mode === "replace-all" ? [] : [...bank];
  const now = Date.now();

  questions.forEach((raw, i) => {
    const line = i + 1;
    const p = raw as Partial<ManagedPuzzle>;
    const incomingUid = typeof p.uid === "string" ? p.uid : "";
    const existingAt = incomingUid
      ? projected.findIndex((x) => x.uid === incomingUid)
      : -1;
    const isUpdate = mode === "update-existing" && existingAt !== -1;

    if (mode === "add-only" && existingAt !== -1) {
      report.rows.push({
        line,
        uid: incomingUid,
        answer: p.answer,
        status: "skipped",
        reason:
          'This question is already in the bank. Choose "Update existing questions" to overwrite it.',
        issues: [],
      });
      report.skipped++;
      return;
    }

    const existing = isUpdate ? projected[existingAt] : undefined;
    const order =
      typeof p.order === "number" ? p.order : existing?.order ?? projected.length;

    const idFree =
      typeof p.id === "number" &&
      !projected.some((x) => x.id === p.id && x.uid !== existing?.uid);

    const draft: ManagedPuzzle = {
      ...(p as ManagedPuzzle),
      uid: isUpdate ? existing!.uid : incomingUid && mode !== "add-only" ? incomingUid : newUid(),
      id: idFree ? (p.id as number) : nextId(projected),
      order,
      boxNumber: order + 1,
      active: p.active ?? true,
      category: p.category || "General",
      difficulty: p.difficulty ?? "medium",
      imageAssets: Array.isArray(p.imageAssets) ? p.imageAssets : [],
      createdAt: typeof p.createdAt === "number" ? p.createdAt : now,
      updatedAt: now,
    };

    const result = validatePuzzle(draft, {
      bank: projected,
      ignoreUid: isUpdate ? draft.uid : undefined,
      knownAssets,
    });

    if (!result.ok) {
      report.rows.push({
        line,
        uid: draft.uid,
        answer: draft.answer,
        status: "error",
        issues: result.errors,
      });
      report.failed++;
      return;
    }

    if (isUpdate) {
      projected[existingAt] = draft;
      report.updated++;
      report.rows.push({ line, uid: draft.uid, answer: draft.answer, status: "updated", issues: [] });
    } else {
      projected.push(draft);
      report.imported++;
      report.rows.push({ line, uid: draft.uid, answer: draft.answer, status: "imported", issues: [] });
    }
  });

  report.nextBank = [...projected]
    .sort((a, b) => a.order - b.order)
    .map((p, i) => ({ ...p, order: i }));

  return report;
}
