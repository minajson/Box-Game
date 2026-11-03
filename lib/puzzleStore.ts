"use client";

import { useMemo, useSyncExternalStore } from "react";

import { PUZZLES } from "@/data/puzzles";
import type { ManagedPuzzle, Puzzle, PuzzleDifficulty } from "./types";

/**
 * The runtime question bank.
 *
 * `data/puzzles.ts` is the bundled SEED. Everything the admin does — add, edit,
 * delete, duplicate, reorder, enable/disable, import — is written to
 * localStorage under one key and read back here, so the game reflects question
 * changes with no source-code edit and no rebuild.
 *
 * WHERE QUESTIONS ARE STORED
 * --------------------------
 * localStorage, key `crackthebox.puzzles.v2`, on the machine running the game.
 * The app is a static export with no server, so this is the only durable store
 * available. Absent that key, the bundled seed plays — which is why a fresh
 * browser behaves exactly like it always did. Use the admin's JSON export to
 * move a bank between machines.
 *
 * WHY THE KEY IS VERSIONED
 * ------------------------
 * A saved bank always wins over the seed, so one saved before a seed update
 * would silently hide the new questions. Bumping the key makes the updated seed
 * play instead. The old bank is never deleted: it stays under `LEGACY_KEY`, and
 * the game and admin both say so until a facilitator dismisses the notice.
 *
 * BOX NUMBERS ARE DERIVED
 * -----------------------
 * `boxNumber` on a stored puzzle is ignored. The wall is built from the ACTIVE
 * puzzles in admin order and renumbered 1..N, so a deleted or disabled question
 * can never leave a dead box behind on the wall.
 */

const KEY = "crackthebox.puzzles.v2";

/** Banks saved before the Myth or Fact update. Read-only from here on. */
const LEGACY_KEY = "crackthebox.puzzles.v1";
const LEGACY_NOTICE_KEY = "crackthebox.puzzles.v1.noticeDismissed";

/** Fixed so the seed's timestamps are deterministic across reloads. */
const SEED_STAMP = Date.UTC(2026, 0, 1);

/** "SCRAMBLE IT!" → "Scramble". Only used to seed the admin's category field. */
function categoryFromLabel(label: string): string {
  const cleaned = label.replace(/[!?.]+$/g, "").trim().toLowerCase();
  if (!cleaned) return "General";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Fill in the admin fields a bundled puzzle does not carry. Runs on the seed
 * AND on anything read back from localStorage, so a bank written by an older
 * version of the app still loads with every field present.
 */
function normalize(p: Puzzle, index: number): ManagedPuzzle {
  return {
    ...p,
    uid: p.uid ?? `seed-${p.id}`,
    active: p.active ?? true,
    order: typeof p.order === "number" ? p.order : index,
    category: p.category ?? categoryFromLabel(p.categoryLabel),
    difficulty: p.difficulty ?? "medium",
    createdAt: p.createdAt ?? SEED_STAMP,
    updatedAt: p.updatedAt ?? SEED_STAMP,
    // Guaranteed non-undefined: PuzzleCanvas reads imageAssets[0] for zoom
    // puzzles without a guard, so this is what stops a hand-built puzzle from
    // crashing the canvas.
    imageAssets: Array.isArray(p.imageAssets) ? p.imageAssets : [],
  };
}

/** The bundled question set, normalised. Never mutated. */
export const SEED_BANK: ManagedPuzzle[] = PUZZLES.map(normalize);

/* -------------------------------------------------------------- internals -- */

/**
 * The cached bank. `getSnapshot` MUST return the same reference until something
 * actually writes, or useSyncExternalStore re-renders forever.
 */
let cache: ManagedPuzzle[] | null = null;
const listeners = new Set<() => void>();
let storageBound = false;

function emit(): void {
  listeners.forEach((fn) => fn());
}

function invalidate(): void {
  cache = null;
}

function sortByOrder(list: ManagedPuzzle[]): ManagedPuzzle[] {
  return [...list].sort((a, b) => a.order - b.order);
}

/** Drop entries that collide on id or uid — duplicates break framer's layoutId. */
function dedupe(list: ManagedPuzzle[]): ManagedPuzzle[] {
  const seenUid = new Set<string>();
  const seenId = new Set<number>();
  const out: ManagedPuzzle[] = [];
  for (const p of list) {
    if (seenUid.has(p.uid) || seenId.has(p.id)) continue;
    seenUid.add(p.uid);
    seenId.add(p.id);
    out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------- read -- */

/** Read the bank from storage, falling back to the bundled seed. */
export function loadBank(): ManagedPuzzle[] {
  if (typeof window === "undefined") return SEED_BANK;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return SEED_BANK;
  }
  if (!raw) return SEED_BANK;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return SEED_BANK;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return SEED_BANK;

  const list = (parsed as Puzzle[])
    .filter((p) => p && typeof p === "object" && typeof p.type === "string")
    .map((p, i) => normalize(p, i));

  return list.length ? sortByOrder(dedupe(list)) : SEED_BANK;
}

/** True when the admin has saved a bank (i.e. we are not on the bundled seed). */
export function hasCustomBank(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

/** The bank saved before the update, exactly as it was stored, if there is one. */
export function legacyBankJson(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

/** True until a facilitator has acknowledged that an old bank was set aside. */
export function legacyBankNoticePending(): boolean {
  if (legacyBankJson() === null) return false;
  try {
    return localStorage.getItem(LEGACY_NOTICE_KEY) === null;
  } catch {
    return false;
  }
}

/** Hides the notice only. The old bank itself stays in storage. */
export function dismissLegacyBankNotice(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LEGACY_NOTICE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ write -- */

export interface SaveResult {
  ok: boolean;
  error?: string;
}

/**
 * Persist a bank. Order is re-sequenced to 0..n-1 first so the stored order is
 * always dense, whatever the caller did to it.
 */
export function saveBank(next: ManagedPuzzle[]): SaveResult {
  if (typeof window === "undefined") return { ok: false, error: "No browser storage." };

  const sequenced = sortByOrder(dedupe(next)).map((p, i) => ({ ...p, order: i }));

  try {
    localStorage.setItem(KEY, JSON.stringify(sequenced));
  } catch (err) {
    const quota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.code === 22);
    return {
      ok: false,
      error: quota
        ? "Browser storage is full. Export your questions, then remove some images or questions."
        : "Could not save to browser storage.",
    };
  }

  invalidate();
  emit();
  return { ok: true };
}

/** Throw the custom bank away and fall back to the bundled seed. */
export function resetBank(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  invalidate();
  emit();
}

/* --------------------------------------------------------------- subscribe -- */

function onStorage(e: StorageEvent): void {
  // e.key is null when storage was cleared wholesale.
  if (e.key !== null && e.key !== KEY) return;
  invalidate();
  emit();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!storageBound && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    storageBound = true;
  }
  return () => {
    listeners.delete(cb);
  };
}

export function getSnapshot(): ManagedPuzzle[] {
  if (cache === null) cache = loadBank();
  return cache;
}

/** The server/hydration snapshot: always the seed, never localStorage. */
export function getServerSnapshot(): ManagedPuzzle[] {
  return SEED_BANK;
}

/** The whole bank, live. Re-renders when any tab writes. */
export function useBank(): ManagedPuzzle[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* -------------------------------------------------------------- selection -- */

/**
 * The playable set: active questions only, in admin order, renumbered 1..N.
 * `sessionLength` of 0 (or anything ≥ the active count) means "all of them".
 */
export function selectActive(
  bank: ManagedPuzzle[],
  sessionLength = 0,
): ManagedPuzzle[] {
  const active = sortByOrder(bank.filter((p) => p.active));
  const capped =
    sessionLength > 0 ? active.slice(0, sessionLength) : active;
  return capped.map((p, i) => ({ ...p, boxNumber: i + 1 }));
}

export function useActivePuzzles(sessionLength = 0): ManagedPuzzle[] {
  const bank = useBank();
  return useMemo(() => selectActive(bank, sessionLength), [bank, sessionLength]);
}

/** Look a puzzle up by its (derived) box number. */
export function puzzleForBox(
  list: ManagedPuzzle[],
  boxNumber: number,
): ManagedPuzzle | undefined {
  return list.find((p) => p.boxNumber === boxNumber);
}

/** FNV-1a over the uid sequence — changes whenever the playable set changes. */
export function bankSignature(list: ManagedPuzzle[]): string {
  const src = list.map((p) => p.uid).join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/* ------------------------------------------------------------------- CRUD -- */
// All pure: (bank, …) => new bank. Callers pass the result to saveBank().

export function nextId(bank: ManagedPuzzle[]): number {
  return bank.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

export function newUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** A blank puzzle to open the Add form on. */
export function blankPuzzle(bank: ManagedPuzzle[]): ManagedPuzzle {
  const now = Date.now();
  return {
    id: nextId(bank),
    uid: newUid(),
    boxNumber: bank.length + 1,
    type: "scramble",
    categoryLabel: "SCRAMBLE IT!",
    prompt: "Unscramble this word",
    answer: "",
    hint: "",
    insight: "",
    imageAssets: [],
    revealAnimation: "rearrange",
    active: true,
    order: bank.length,
    category: "General",
    difficulty: "medium",
    createdAt: now,
    updatedAt: now,
    scrambledValue: "",
  };
}

export function createPuzzle(
  bank: ManagedPuzzle[],
  draft: ManagedPuzzle,
): ManagedPuzzle[] {
  const now = Date.now();
  const created: ManagedPuzzle = {
    ...draft,
    id: nextId(bank),
    uid: draft.uid || newUid(),
    order: bank.length,
    createdAt: now,
    updatedAt: now,
  };
  return [...bank, created];
}

export function updatePuzzle(
  bank: ManagedPuzzle[],
  draft: ManagedPuzzle,
): ManagedPuzzle[] {
  return bank.map((p) =>
    p.uid === draft.uid ? { ...draft, createdAt: p.createdAt, updatedAt: Date.now() } : p,
  );
}

export function deletePuzzle(bank: ManagedPuzzle[], uid: string): ManagedPuzzle[] {
  return bank.filter((p) => p.uid !== uid);
}

/**
 * Copy a puzzle in directly below its source. The copy starts INACTIVE and its
 * answer is suffixed, so the duplicate-answer check flags it in the admin now
 * rather than the room noticing the same answer twice on stage.
 */
export function duplicatePuzzle(
  bank: ManagedPuzzle[],
  uid: string,
): { bank: ManagedPuzzle[]; created?: ManagedPuzzle } {
  const source = bank.find((p) => p.uid === uid);
  if (!source) return { bank };

  const now = Date.now();
  const copy: ManagedPuzzle = {
    ...structuredClone(source),
    id: nextId(bank),
    uid: newUid(),
    answer: `${source.answer} (COPY)`,
    active: false,
    order: source.order + 0.5,
    createdAt: now,
    updatedAt: now,
  };

  return { bank: sortByOrder([...bank, copy]).map((p, i) => ({ ...p, order: i })), created: copy };
}

export function toggleActive(
  bank: ManagedPuzzle[],
  uid: string,
): ManagedPuzzle[] {
  return bank.map((p) =>
    p.uid === uid ? { ...p, active: !p.active, updatedAt: Date.now() } : p,
  );
}

/** Move one position up (-1) or down (+1) in the true bank order. */
export function movePuzzle(
  bank: ManagedPuzzle[],
  uid: string,
  delta: number,
): ManagedPuzzle[] {
  const ordered = sortByOrder(bank);
  const from = ordered.findIndex((p) => p.uid === uid);
  if (from === -1) return bank;
  const to = from + delta;
  if (to < 0 || to >= ordered.length) return bank;

  const next = [...ordered];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((p, i) => ({ ...p, order: i }));
}

/** Put a puzzle at a specific 1-based position. */
export function setOrder(
  bank: ManagedPuzzle[],
  uid: string,
  position: number,
): ManagedPuzzle[] {
  const ordered = sortByOrder(bank);
  const from = ordered.findIndex((p) => p.uid === uid);
  if (from === -1) return bank;
  const to = Math.max(0, Math.min(ordered.length - 1, position - 1));
  if (to === from) return bank;

  const next = [...ordered];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((p, i) => ({ ...p, order: i }));
}

/** Apply a whole reordered list (drag and drop). */
export function applyOrder(ordered: ManagedPuzzle[]): ManagedPuzzle[] {
  return ordered.map((p, i) => ({ ...p, order: i }));
}

/* ------------------------------------------------------------------ facets -- */

export function categoriesIn(bank: ManagedPuzzle[]): string[] {
  return Array.from(new Set(bank.map((p) => p.category).filter(Boolean))).sort();
}

export function difficultyLabel(d: PuzzleDifficulty): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}
