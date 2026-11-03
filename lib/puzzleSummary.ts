import type { ManagedPuzzle, PuzzleType } from "./types";
import { TYPE_LABELS } from "./puzzleValidation";

/**
 * Read-only projections of a question, for the admin list.
 *
 * `shortPreview` answers "which question is this?" at a glance without opening
 * it, so it shows the CLUE rather than the answer wherever a clue exists — the
 * answer is already its own column-mate in the row.
 */

const MAX_PREVIEW = 90;

function clip(s: string, max = MAX_PREVIEW): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** The visible text of one rebus/emoji row, e.g. "STAND / — / I". */
function rowText(p: ManagedPuzzle): string {
  const rows = p.rows ?? [];
  const bits: string[] = [];
  for (const row of rows) {
    if (row.divider) {
      bits.push("—");
      continue;
    }
    for (const part of row.parts ?? []) {
      // A picture clue's caption IS its meaning ("⬅️ BACK" reads as BACK), so
      // never drop it — the preview would be unrecognisable without it.
      const glyph = [part.emoji, part.text].filter(Boolean).join("");
      if (glyph) {
        bits.push(part.caption ? `${glyph}(${part.caption})` : glyph);
      } else if (part.assetIndex !== undefined) {
        bits.push(part.caption ? `[${part.caption}]` : "[image]");
      } else if (part.boxed) {
        bits.push("[box]");
      }
    }
  }
  return bits.join(" ");
}

export function typeLabel(t: PuzzleType): string {
  return TYPE_LABELS[t] ?? t;
}

/** The filename of an asset path, for compact display. */
export function assetName(path: string): string {
  if (path.startsWith("data:")) return "uploaded image";
  return path.split("/").pop() || path;
}

export function shortPreview(p: ManagedPuzzle): string {
  switch (p.type) {
    case "scramble":
      return clip(`${p.scrambledValue || "?"} → ${p.answer}`);
    case "missing-letters":
      return clip(p.maskedValue || p.answer);
    case "connect":
      return clip((p.clues ?? []).join(" · ") || p.answer);
    case "myth-fact":
      return clip(p.clues?.[0] || p.answer);
    case "clickable":
      return clip(
        p.interaction === "hotspot"
          ? (p.hotspots ?? []).map((h) => h.label).join(" · ") || p.answer
          : (p.options ?? []).map((o) => o.label).join(" · ") || p.answer,
      );
    case "odd-one-out":
      return clip((p.choices ?? []).map((c) => c.label).join(" · ") || p.answer);
    case "zoom":
      return clip(p.imageAssets[0] ? assetName(p.imageAssets[0]) : "no image yet");
    default:
      return clip(rowText(p) || p.answer);
  }
}

/**
 * Everything searchable about a question, lower-cased. Includes the answer and
 * the hint so a facilitator can find a question by what it is about, not just by
 * how it looks on screen.
 */
export function searchBlob(p: ManagedPuzzle): string {
  return [
    p.answer,
    p.prompt,
    p.hint,
    p.insight,
    p.category,
    p.categoryLabel,
    p.type,
    typeLabel(p.type),
    p.difficulty,
    p.scrambledValue,
    p.maskedValue,
    ...(p.clues ?? []),
    ...(p.choices ?? []).map((c) => c.label),
    p.scenario,
    ...(p.options ?? []).map((o) => o.label),
    ...(p.hotspots ?? []).map((h) => h.label),
    rowText(p),
    ...p.imageAssets,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** "3 days ago", with the full timestamp for the title attribute. */
export function relativeTime(ms: number): string {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["week", 604800000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (abs >= size) return rtf.format(Math.round(diff / size), unit);
  }
  return rtf.format(Math.round(diff / 1000), "second");
}

export function fullTime(ms: number): string {
  return new Date(ms).toLocaleString();
}
