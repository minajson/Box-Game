"use client";

import { useMemo, useSyncExternalStore } from "react";

import { PUZZLES } from "@/data/puzzles";
import { NAPE_PUZZLES } from "@/data/nape2026";
import {
  DEFAULT_EVENT,
  EVENTS,
  isEventId,
  membershipOf,
  presetActive,
  type EventId,
} from "@/data/events";
import type { ManagedPuzzle, Puzzle, PuzzleDifficulty } from "./types";

/**
 * The runtime question bank — a bundled SEED plus a small layer of admin
 * OVERRIDES.
 *
 * THE SEED
 * --------
 * `data/puzzles.ts` (the original 60) and `data/nape2026.ts` (the 80 NAPE
 * questions) ship inside the bundle. They are never mutated, so a fresh browser,
 * a second laptop or a new deployment always starts from the same, correct
 * game, offline.
 *
 * EVENTS
 * ------
 * One bank, several events (`data/events.ts`). An event is only an ordered list
 * of uids plus how many are Active. Switching event changes which questions are
 * Active and in what order — it never copies, creates or deletes a question.
 * Hidden questions keep all their data, images and explanations.
 *
 * THE OVERRIDES (localStorage `crackthebox.overrides.v5`)
 * -------------------------------------------------------
 * Only what the admin CHANGED is stored, not a copy of the bank:
 *
 *   event     the selected event
 *   edits     content changes to bundled questions, field by field
 *   custom    questions the admin created
 *   removed   bundled questions the admin deleted
 *   active    per event: Active/Hidden choices that differ from the preset
 *   order     per event: a custom play order, when the preset's was changed
 *
 * Because it is a diff, a future seed update (a corrected fun fact, new
 * questions) reaches every browser, and the admin's own edits still win. The
 * overrides also export/import as one JSON file to move admin changes between
 * devices (see `exportOverrides` / `importOverrides`).
 *
 * OLDER BROWSERS
 * --------------
 * A bank saved by the previous version (`crackthebox.puzzles.v4`) is migrated in
 * memory into the original-60 event — edits, additions, deletions, Active state
 * and order — and the old key is left untouched. Banks older than v4 are still
 * set aside with the existing notice.
 *
 * BOX NUMBERS ARE DERIVED
 * -----------------------
 * `boxNumber` on a stored puzzle is ignored. The wall is built from the ACTIVE
 * puzzles in order and renumbered 1..N.
 */

const OVERRIDES_KEY = "crackthebox.overrides.v5";
const V4_KEY = "crackthebox.puzzles.v4";

/** Banks saved before the v4 layout, newest first. Read-only from here on. */
const LEGACY_KEYS = ["crackthebox.puzzles.v3", "crackthebox.puzzles.v2", "crackthebox.puzzles.v1"];

function legacyKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return LEGACY_KEYS.find((k) => localStorage.getItem(k) !== null) ?? null;
  } catch {
    return null;
  }
}

const noticeKey = (key: string) => `${key}.noticeDismissed`;

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
 * AND on anything read back from storage, so older data still loads with every
 * field present.
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
    // puzzles without a guard.
    imageAssets: Array.isArray(p.imageAssets) ? p.imageAssets : [],
  };
}

/** Every bundled question (60 original + 80 NAPE), normalised and tagged. Never mutated. */
const SEED_LIST: ManagedPuzzle[] = [...PUZZLES, ...NAPE_PUZZLES].map((p, i) => {
  const n = normalize(p, i);
  return { ...n, events: n.events ?? membershipOf(n.uid) };
});
const SEED_BY_UID = new Map(SEED_LIST.map((p) => [p.uid, p]));

/** The default-event bank, used for the server render and as the reset target. */
export const SEED_BANK: ManagedPuzzle[] = [];

/* ----------------------------------------------------------- overrides -- */

type Delta = Record<string, unknown>;

export interface Overrides {
  v: 5;
  event: EventId;
  edits: Record<string, Delta>;
  custom: ManagedPuzzle[];
  removed: string[];
  active: Partial<Record<EventId, Record<string, boolean>>>;
  order: Partial<Record<EventId, string[]>>;
}

function emptyOverrides(): Overrides {
  return { v: 5, event: DEFAULT_EVENT, edits: {}, custom: [], removed: [], active: {}, order: {} };
}

/** Fields that are per-event or derived, so never part of a content edit. */
const NOT_CONTENT = new Set(["active", "order", "boxNumber", "createdAt", "updatedAt"]);

/** Field-by-field difference between the seed question and the admin's copy. `null` = removed. */
function contentDelta(seed: ManagedPuzzle, next: ManagedPuzzle): Delta {
  const delta: Delta = {};
  const keys = new Set([...Object.keys(seed), ...Object.keys(next)]);
  for (const k of keys) {
    if (NOT_CONTENT.has(k)) continue;
    const a = (seed as unknown as Delta)[k];
    const b = (next as unknown as Delta)[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    delta[k] = b === undefined ? null : b;
  }
  if (Object.keys(delta).length > 0) delta.updatedAt = next.updatedAt;
  return delta;
}

function applyDelta(seed: ManagedPuzzle, delta: Delta): ManagedPuzzle {
  const out = { ...seed } as unknown as Delta;
  for (const [k, v] of Object.entries(delta)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out as unknown as ManagedPuzzle;
}

/** The play order an event has when nothing has been reordered. */
function defaultOrder(event: EventId, customs: ManagedPuzzle[], removed: Set<string>): string[] {
  const preset = EVENTS[event].order.filter((u) => !removed.has(u));
  const inPreset = new Set(preset);
  const rest = SEED_LIST.filter((p) => !inPreset.has(p.uid) && !removed.has(p.uid)).map((p) => p.uid);
  const extra = [...customs].sort((a, b) => a.createdAt - b.createdAt).map((p) => p.uid);
  return [...preset, ...rest, ...extra];
}

/** Resolve the overrides into the full bank for the selected event. */
function materialize(o: Overrides): ManagedPuzzle[] {
  const removed = new Set(o.removed);
  const event = o.event;
  const presetOn = presetActive(event);
  const activeFor = o.active[event] ?? {};

  const usedIds = new Set<number>(SEED_LIST.map((p) => p.id));
  const customs: ManagedPuzzle[] = [];
  const seenUid = new Set<string>(SEED_BY_UID.keys());
  for (const raw of o.custom) {
    if (!raw || typeof raw !== "object" || seenUid.has(raw.uid)) continue;
    seenUid.add(raw.uid);
    const p = normalize(raw, customs.length);
    // A hand-built or migrated id can collide with a bundled one. Re-number it
    // rather than drop the question — identity is the uid, not the id.
    let id = p.id;
    while (usedIds.has(id)) id++;
    usedIds.add(id);
    customs.push({ ...p, id });
  }

  const byUid = new Map<string, ManagedPuzzle>();
  for (const seed of SEED_LIST) {
    if (removed.has(seed.uid)) continue;
    const delta = o.edits[seed.uid];
    byUid.set(seed.uid, delta ? normalize(applyDelta(seed, delta), seed.order) : seed);
  }
  for (const c of customs) byUid.set(c.uid, c);

  const saved = o.order[event];
  const sequence = saved
    ? [...saved.filter((u) => byUid.has(u)), ...defaultOrder(event, customs, removed).filter((u) => !saved.includes(u))]
    : defaultOrder(event, customs, removed);

  const out: ManagedPuzzle[] = [];
  sequence.forEach((uid, i) => {
    const p = byUid.get(uid);
    if (!p || out.some((x) => x.uid === uid)) return;
    const isSeed = SEED_BY_UID.has(uid);
    const active = uid in activeFor ? activeFor[uid] : isSeed ? presetOn.has(uid) : false;
    out.push({ ...p, active, order: i, boxNumber: i + 1 });
  });
  return out;
}

/**
 * Turn a full bank (as the admin edits it) back into overrides, storing only
 * what differs from the seed and the event's preset.
 */
function buildOverrides(
  prev: Overrides,
  next: ManagedPuzzle[],
  event: EventId,
  scope: Set<string> = new Set(SEED_BY_UID.keys()),
): Overrides {
  const edits: Record<string, Delta> = {};
  const custom: ManagedPuzzle[] = [];
  const presetOn = presetActive(event);
  const activeHere: Record<string, boolean> = {};
  const present = new Set(next.map((p) => p.uid));

  for (const p of next) {
    const seed = SEED_BY_UID.get(p.uid);
    if (seed) {
      const delta = contentDelta(seed, p);
      if (Object.keys(delta).length > 0) edits[p.uid] = delta;
    } else {
      const { active: _a, order: _o, boxNumber: _b, ...rest } = p;
      void _a; void _o; void _b;
      custom.push({ ...rest, boxNumber: 0, active: false, order: 0 } as ManagedPuzzle);
    }
    const fallback = seed ? presetOn.has(p.uid) : false;
    if (p.active !== fallback) activeHere[p.uid] = p.active;
  }

  const removed = [...scope].filter((u) => !present.has(u));
  const removedSet = new Set(removed);
  const ordered = [...next].sort((a, b) => a.order - b.order).map((p) => p.uid);
  const baseline = defaultOrder(event, custom, removedSet);

  const order = { ...prev.order };
  if (JSON.stringify(ordered) === JSON.stringify(baseline)) delete order[event];
  else order[event] = ordered;

  const active = { ...prev.active };
  if (Object.keys(activeHere).length === 0) delete active[event];
  else active[event] = activeHere;

  return { v: 5, event, edits, custom, removed, active, order };
}

/* ----------------------------------------------------------- persistence -- */

function isOverrides(v: unknown): v is Overrides {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<Overrides>;
  return (
    o.v === 5 &&
    isEventId(o.event) &&
    typeof o.edits === "object" && o.edits !== null &&
    Array.isArray(o.custom) &&
    Array.isArray(o.removed) &&
    typeof o.active === "object" && o.active !== null &&
    typeof o.order === "object" && o.order !== null
  );
}

/** A v4 bank (the previous version's whole-bank save), migrated into the original-60 event. */
function migrateV4(raw: string): Overrides | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const list = (parsed as Puzzle[])
    .filter((p) => p && typeof p === "object" && typeof p.type === "string")
    .map((p, i) => normalize(p, i));
  if (list.length === 0) return null;

  const original = new Set(EVENTS["original-60"].order);
  // v4 banks only ever held the originals plus the admin's own questions. A v4
  // "seed-N" row is a bundled original; anything else is the admin's.
  const next = list.filter((p) => !SEED_BY_UID.has(p.uid) || original.has(p.uid));
  // The migrated bank only speaks for the originals; NAPE questions stay as
  // the preset has them. Its order is relative to the original event.
  const base = emptyOverrides();
  const built = buildOverrides(base, next, "original-60", original);
  return { ...built, event: DEFAULT_EVENT };
}

let cacheOverrides: Overrides | null = null;
let cacheBank: ManagedPuzzle[] | null = null;
const listeners = new Set<() => void>();
let storageBound = false;

function emit(): void {
  listeners.forEach((fn) => fn());
}

function invalidate(): void {
  cacheOverrides = null;
  cacheBank = null;
}

function readOverrides(): Overrides {
  if (typeof window === "undefined") return emptyOverrides();
  if (cacheOverrides) return cacheOverrides;
  let result: Overrides | null = null;
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isOverrides(parsed)) result = parsed;
    } else {
      const v4 = localStorage.getItem(V4_KEY);
      if (v4) result = migrateV4(v4);
    }
  } catch {
    result = null;
  }
  cacheOverrides = result ?? emptyOverrides();
  return cacheOverrides;
}

function writeOverrides(next: Overrides): SaveResult {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
  } catch (err) {
    const quota =
      err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22);
    return {
      ok: false,
      error: quota
        ? "Browser storage is full. Export your admin changes, then remove some uploaded images."
        : "Could not save to browser storage.",
    };
  }
  invalidate();
  emit();
  return { ok: true };
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

/* --------------------------------------------------------------- reading -- */

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

/** The whole bank for the selected event: every question, Active or Hidden. */
export function loadBank(): ManagedPuzzle[] {
  if (typeof window === "undefined") return SEED_BANK;
  if (cacheBank) return cacheBank;
  cacheBank = materialize(readOverrides());
  return cacheBank;
}

SEED_BANK.push(...materialize(emptyOverrides()));

/** The selected event. */
export function getEvent(): EventId {
  return readOverrides().event;
}

/** True once the admin has changed anything from the bundled defaults. */
export function hasCustomBank(): boolean {
  if (typeof window === "undefined") return false;
  const o = readOverrides();
  return (
    o.event !== DEFAULT_EVENT ||
    Object.keys(o.edits).length > 0 ||
    o.custom.length > 0 ||
    o.removed.length > 0 ||
    Object.keys(o.active).length > 0 ||
    Object.keys(o.order).length > 0
  );
}

/** The newest bank set aside by an older version, exactly as it was stored, if any. */
export function legacyBankJson(): string | null {
  const key = legacyKey();
  if (key === null) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function legacyBankNoticePending(): boolean {
  const key = legacyKey();
  if (key === null) return false;
  try {
    return localStorage.getItem(noticeKey(key)) === null;
  } catch {
    return false;
  }
}

export function dismissLegacyBankNotice(): void {
  const key = legacyKey();
  if (key === null) return;
  try {
    localStorage.setItem(noticeKey(key), "1");
  } catch {
    /* ignore */
  }
}

/* --------------------------------------------------------------- writing -- */

/**
 * Persist the bank the admin is editing. Order is re-sequenced to 0..n-1 first
 * so the stored order is always dense, whatever the caller did to it. Only the
 * difference from the bundled seed and the event preset is stored.
 */
export function saveBank(next: ManagedPuzzle[]): SaveResult {
  if (typeof window === "undefined") return { ok: false, error: "No browser storage." };
  const sequenced = sortByOrder(dedupe(next)).map((p, i) => ({ ...p, order: i }));
  const current = readOverrides();
  return writeOverrides(buildOverrides(current, sequenced, current.event));
}

/** Switch the selected event. Nothing is created, copied or deleted. */
export function setEvent(event: EventId): SaveResult {
  if (typeof window === "undefined") return { ok: false, error: "No browser storage." };
  const current = readOverrides();
  if (current.event === event) return { ok: true };
  return writeOverrides({ ...current, event });
}

/**
 * Put one event back to its preset: Active/Hidden choices and order are cleared
 * and any bundled question deleted from the bank is restored. Admin EDITS to
 * question content are kept — use `resetBank` to discard those too.
 */
export function resetEventToPreset(event: EventId): SaveResult {
  const current = readOverrides();
  const active = { ...current.active };
  const order = { ...current.order };
  delete active[event];
  delete order[event];
  return writeOverrides({ ...current, active, order, removed: [] });
}

/** Throw every admin change away and fall back to the bundled defaults (NAPE 2026). */
export function resetBank(): void {
  if (typeof window === "undefined") return;
  // An explicit empty record, not a removed key — otherwise the v4 bank would
  // be migrated straight back in.
  writeOverrides(emptyOverrides());
}

/** Everything the admin has changed, as one JSON file to move to another device. */
export function exportOverrides(): string {
  return `${JSON.stringify(
    {
      format: "crack-the-box/admin-state",
      version: 1,
      exportedAt: new Date().toISOString(),
      overrides: readOverrides(),
    },
    null,
    2,
  )}\n`;
}

/** Replace this browser's admin changes with an exported file. */
export function importOverrides(text: string): SaveResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  const o = (parsed as { format?: string; overrides?: unknown })?.overrides;
  if ((parsed as { format?: string })?.format !== "crack-the-box/admin-state" || !isOverrides(o)) {
    return { ok: false, error: "That is not an admin-state export from this game." };
  }
  return writeOverrides(o);
}

/* --------------------------------------------------------------- subscribe -- */

function onStorage(e: StorageEvent): void {
  // e.key is null when storage was cleared wholesale.
  if (e.key !== null && e.key !== OVERRIDES_KEY && e.key !== V4_KEY) return;
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
  return loadBank();
}

/** The server/hydration snapshot: always the default event, never localStorage. */
export function getServerSnapshot(): ManagedPuzzle[] {
  return SEED_BANK;
}

/** The whole bank, live. Re-renders when any tab writes. */
export function useBank(): ManagedPuzzle[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The selected event, live. */
export function useEvent(): EventId {
  return useSyncExternalStore(subscribe, getEvent, () => DEFAULT_EVENT);
}

/* -------------------------------------------------------------- selection -- */

/**
 * The playable set: Active questions only, in order, renumbered 1..N.
 * `sessionLength` of 0 (or anything ≥ the active count) means "all of them".
 * An event with a fixed size (NAPE: exactly 100) ignores the cap.
 */
export function selectActive(
  bank: ManagedPuzzle[],
  sessionLength = 0,
): ManagedPuzzle[] {
  const active = sortByOrder(bank.filter((p) => p.active));
  const cap = EVENTS[getEvent()].fixedSize ? 0 : sessionLength;
  const capped = cap > 0 ? active.slice(0, cap) : active;
  return capped.map((p, i) => ({ ...p, boxNumber: i + 1 }));
}

export function useActivePuzzles(sessionLength = 0): ManagedPuzzle[] {
  const bank = useBank();
  const event = useEvent();
  // `event` is a dependency because selectActive reads it for the size cap.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selectActive(bank, sessionLength), [bank, sessionLength, event]);
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
    events: [getEvent()],
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
 * Copy a puzzle in directly below its source. The copy starts HIDDEN and its
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
  const { nape: _nape, ...rest } = structuredClone(source);
  void _nape; // A copy is the admin's own question, not the imported document's.
  const copy: ManagedPuzzle = {
    ...rest,
    id: nextId(bank),
    uid: newUid(),
    answer: `${source.answer} (COPY)`,
    active: false,
    order: source.order + 0.5,
    events: [getEvent()],
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

/** Show or hide many questions at once. Never deletes anything. */
export function setActiveMany(
  bank: ManagedPuzzle[],
  uids: ReadonlySet<string>,
  active: boolean,
): ManagedPuzzle[] {
  return bank.map((p) => (uids.has(p.uid) && p.active !== active ? { ...p, active } : p));
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
