#!/usr/bin/env node
/**
 * Regenerate data/media-manifest.json from the files in public/media/puzzles/.
 *
 * The manifest is what the admin's media picker offers, and it also tells the
 * question validator which image paths exist — a static export has no way to
 * list a directory at runtime, so this file is that list.
 *
 * Hand-written `label`, `alt` and `tags` are preserved for paths that are still
 * present, so running this after dropping in a new image only ADDS an entry.
 * New entries get a label guessed from the filename and an empty alt for you to
 * fill in.
 *
 *   npm run media:manifest
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mediaDir = join(root, "public", "media", "puzzles");
const manifestPath = join(root, "data", "media-manifest.json");

const IMAGE_EXT = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

if (!existsSync(mediaDir)) {
  console.error(`No such directory: ${mediaDir}`);
  process.exit(1);
}

/** "zoom-puzzle-piece.svg" → "Zoom puzzle piece" */
function labelFor(file) {
  const stem = basename(file, extname(file));
  const words = stem.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const previous = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { images: [] };
const byPath = new Map((previous.images ?? []).map((img) => [img.path, img]));

const files = readdirSync(mediaDir)
  .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
  .sort();

let added = 0;
const images = files.map((file) => {
  const path = `/media/puzzles/${file}`;
  const existing = byPath.get(path);
  if (existing) return existing;
  added++;
  return { path, label: labelFor(file), alt: "", tags: [] };
});

const removed = [...byPath.keys()].filter(
  (p) => !images.some((img) => img.path === p),
);

const next = {
  note: previous.note ??
    "Puzzle artwork available to the question admin. Regenerate with `npm run media:manifest` after adding files to public/media/puzzles/ — label, alt and tags are preserved across runs.",
  images,
};

writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);

console.log(`data/media-manifest.json — ${images.length} image(s)`);
if (added) console.log(`  ${added} added (fill in their alt text)`);
if (removed.length) {
  console.log(`  ${removed.length} removed: ${removed.join(", ")}`);
  console.log("  Questions still pointing at those paths will show as problems in the admin.");
}
const missingAlt = images.filter((i) => !i.alt).map((i) => i.path);
if (missingAlt.length) console.log(`  no alt text yet: ${missingAlt.join(", ")}`);
