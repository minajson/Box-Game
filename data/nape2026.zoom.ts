import type { Puzzle } from "@/lib/types";

/**
 * NAPE 2026 Zoom In challenges — oil and gas equipment.
 *
 * Five NAPE-specific records that stand in for the five everyday-object Zoom In
 * puzzles (light bulb, compass, key, jigsaw piece, seedling) inside the NAPE
 * 2026 event. They are ordinary `zoom` puzzles: the existing zoom engine, its
 * stages, timing, sounds, scoring and the Hint button are used exactly as the
 * originals use them — only the content differs.
 *
 * The originals (ids 7, 16, 25, 34, 43 in data/puzzles.ts) are untouched and
 * stay in the Original Crack the Box event; the NAPE event preset swaps them
 * for these five in the same box positions (scripts/nape-config.mjs →
 * NAPE_ZOOM_SWAP, applied by scripts/build-event-order.mjs).
 *
 * Hints: the game has one hint field per question, shown by the Hint button.
 * Each question gives two short hints in that field, separated by " · ".
 * Pictures: scripts/generate-nape-zoom-equipment.mjs.
 */

const PICTURE_DIR = "/media/puzzles/nape/zoom";

function zoom(
  id: number,
  slug: string,
  answer: string,
  hint: string,
  insight: string,
  picture: string,
): Puzzle {
  return {
    id,
    uid: `nape26-zoom-${slug}`,
    boxNumber: id, // Derived at runtime; see selectActive.
    type: "zoom",
    categoryLabel: "ZOOM IN!",
    prompt: "What is this? Zoom out for more clues",
    answer,
    hint,
    insight,
    imageAssets: [`${PICTURE_DIR}/${picture}`],
    revealAnimation: "zoom-out",
    events: ["nape-2026"],
  };
}

export const NAPE_ZOOM_PUZZLES: Puzzle[] = [
  zoom(
    181,
    "bop",
    "A BLOWOUT PREVENTER (BOP)",
    "Stacked on top of the wellhead · Its rams can seal the well in an emergency",
    "The BOP is the well's emergency brake: hydraulic rams can seal the hole if pressure gets out of control.",
    "bop.svg",
  ),
  zoom(
    182,
    "christmas-tree",
    "A WELLHEAD CHRISTMAS TREE",
    "Valves on top of a producing well · Its stacked shape gave it a festive name",
    "The tree's master, wing and swab valves control and isolate the flow of oil and gas from a producing well.",
    "christmas-tree.svg",
  ),
  zoom(
    183,
    "drill-bit",
    "A DRILL BIT",
    "At the very end of the drill string · Its carbide-studded cones crush the rock",
    "Tricone bits crush and chip rock as they turn; drilling mud carries the cuttings up to the surface.",
    "drill-bit.svg",
  ),
  zoom(
    184,
    "pipeline-pig",
    "A PIPELINE PIG",
    "Pushed along a pipeline by the flow · It cleans and inspects from the inside",
    "Pigs travel with the product to clean the line, separate batches or inspect the wall for corrosion.",
    "pipeline-pig.svg",
  ),
  zoom(
    185,
    "pressure-gauge",
    "A PRESSURE GAUGE",
    "A needle sweeps across a dial · It shows how hard the fluid pushes in the line",
    "In a Bourdon-tube gauge, pressure flexes a curved tube and that small movement swings the needle.",
    "pressure-gauge.svg",
  ),
];
