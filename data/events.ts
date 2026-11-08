import order from "./events.order.json";

/**
 * EVENT PRESETS
 * -------------
 * An event is a *view* over the one question bank: an ordered list of question
 * uids plus how many of them are Active. Switching event never copies, creates
 * or deletes a question — it only changes which uids are Active and in what
 * order. See lib/puzzleStore.ts for how admin changes layer on top.
 */

export type EventId = "nape-2026" | "original-60";

export interface EventPreset {
  id: EventId;
  name: string;
  description: string;
  /** Every uid, in play order: the first `playable` are Active, the rest Hidden. */
  order: string[];
  playable: number;
  /** When true the "questions per session" cap is ignored — the wall is always full. */
  fixedSize: boolean;
}

const NAPE_PLAYABLE = 100;

export const EVENTS: Record<EventId, EventPreset> = {
  "nape-2026": {
    id: "nape-2026",
    name: "NAPE 2026",
    description:
      "80 Oil & Gas questions mixed with 20 fun visual puzzles. Exactly 100 boxes; every other original question is hidden.",
    order: order["nape-2026"],
    playable: NAPE_PLAYABLE,
    fixedSize: true,
  },
  "original-60": {
    id: "original-60",
    name: "Original Crack the Box",
    description: "The original 60-question game, in its original order. NAPE questions are hidden.",
    order: order["original-60"],
    playable: 60,
    fixedSize: false,
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** NAPE 2026 is the default event for a browser that has never chosen one. */
export const DEFAULT_EVENT: EventId = "nape-2026";

export function isEventId(v: unknown): v is EventId {
  return typeof v === "string" && v in EVENTS;
}

/** The uids that are Active by default in an event. */
export function presetActive(id: EventId): Set<string> {
  const e = EVENTS[id];
  return new Set(e.order.slice(0, e.playable));
}

/** Event membership tags for a bundled question, derived from the presets. */
export function membershipOf(uid: string): EventId[] {
  const out: EventId[] = [];
  if (EVENTS["nape-2026"].order.slice(0, NAPE_PLAYABLE).includes(uid)) out.push("nape-2026");
  if (EVENTS["original-60"].order.includes(uid)) out.push("original-60");
  return out;
}
