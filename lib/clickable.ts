import type { ClickOption, ClickResponse, Hotspot, Puzzle } from "./types";

/**
 * Clickable challenges: the rules that decide when an answer is complete and
 * whether it is right. Pure functions, shared by the game, the admin preview and
 * the validator, so the screen and the scoring can never disagree.
 */

export const EMPTY_RESPONSE: ClickResponse = { picks: [], marks: [] };

/** True when the scene photo is required: you cannot click or zoom into nothing. */
export function needsScene(p: Puzzle): boolean {
  return p.interaction === "hotspot" || (p.interaction === "choice" && p.sceneZoom === true);
}

/** The scene photo's path, if the challenge has one. */
export function sceneSrc(p: Puzzle): string | undefined {
  const index = p.sceneAsset ?? (needsScene(p) ? 0 : undefined);
  return index === undefined ? undefined : p.imageAssets[index];
}

/** How many picks make a complete answer. */
export function requiredPicks(p: Puzzle): number {
  switch (p.interaction) {
    case "hotspot":
      return p.selectCount ?? p.hotspots?.length ?? 1;
    case "sequence":
      return p.options?.length ?? 0;
    default:
      return p.selectCount ?? 1;
  }
}

/** How many picks have been made so far. */
export function pickCount(p: Puzzle, r: ClickResponse): number {
  return p.interaction === "hotspot" ? r.marks.length : r.picks.length;
}

export function isComplete(p: Puzzle, r: ClickResponse): boolean {
  const need = requiredPicks(p);
  return need > 0 && pickCount(p, r) === need;
}

/** The hotspot a click lands in, if any. */
export function hotspotAt(
  hotspots: Hotspot[] | undefined,
  mark: { x: number; y: number },
): Hotspot | undefined {
  return (hotspots ?? []).find((h) =>
    h.areas.some(
      (a) =>
        mark.x >= a.x && mark.x <= a.x + a.w && mark.y >= a.y && mark.y <= a.y + a.h,
    ),
  );
}

/** The hotspots the marks found, each counted once. */
export function foundHotspots(p: Puzzle, r: ClickResponse): Set<string> {
  const found = new Set<string>();
  for (const m of r.marks) {
    const h = hotspotAt(p.hotspots, m);
    if (h) found.add(h.id);
  }
  return found;
}

/**
 * Right or wrong.
 *
 *   choice    every pick is a correct option (and the count is complete)
 *   hotspot   every click found a different hotspot
 *   sequence  the cards were clicked in the listed order
 */
export function isCorrect(p: Puzzle, r: ClickResponse): boolean {
  if (!isComplete(p, r)) return false;
  switch (p.interaction) {
    case "hotspot":
      return foundHotspots(p, r).size === r.marks.length;
    case "sequence":
      return (p.options ?? []).every((o, i) => r.picks[i] === o.id);
    default: {
      const correct = new Set((p.options ?? []).filter((o) => o.correct).map((o) => o.id));
      return r.picks.every((id) => correct.has(id));
    }
  }
}

/**
 * Choice: toggle an option. A single-answer question swaps the pick; a
 * multi-answer one adds until full, then ignores further picks.
 */
export function toggleChoice(p: Puzzle, r: ClickResponse, id: string): ClickResponse {
  if (r.picks.includes(id)) return { ...r, picks: r.picks.filter((x) => x !== id) };
  const need = requiredPicks(p);
  if (need === 1) return { ...r, picks: [id] };
  if (r.picks.length >= need) return r;
  return { ...r, picks: [...r.picks, id] };
}

/** Sequence: click a card to give it the next number; click again to take it back. */
export function toggleSequence(r: ClickResponse, id: string): ClickResponse {
  return r.picks.includes(id)
    ? { ...r, picks: r.picks.filter((x) => x !== id) }
    : { ...r, picks: [...r.picks, id] };
}

/** Hotspot: add a mark, unless every mark is already placed. */
export function addMark(p: Puzzle, r: ClickResponse, mark: { x: number; y: number }): ClickResponse {
  if (r.marks.length >= requiredPicks(p)) return r;
  return { ...r, marks: [...r.marks, mark] };
}

export function removeMark(r: ClickResponse, index: number): ClickResponse {
  return { ...r, marks: r.marks.filter((_, i) => i !== index) };
}

/**
 * The order a sequence's cards are shown in before it is solved. Deterministic,
 * so a refresh or a second screen shows the same jumble, and never the answer
 * order itself.
 */
export function shuffledOptions(p: Puzzle): ClickOption[] {
  const options = p.options ?? [];
  if (options.length < 2) return options;

  let seed = 0;
  for (const ch of p.uid ?? String(p.id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Never show the cards already in the right order.
  if (out.every((o, i) => o.id === options[i].id)) out.push(out.shift()!);
  return out;
}

/** Card letters, A to F. */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}
