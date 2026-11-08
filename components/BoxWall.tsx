"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MysteryBox from "./MysteryBox";
import SoundControl from "./SoundControl";
import FullscreenControl from "./FullscreenControl";
import { GameHeaderFull } from "./GameHeader";
import type { GameSettings } from "@/lib/types";

/** Above this many boxes the wall switches to a fit-to-screen grid (no scrolling). */
const DENSE_FROM = 61;
/** Smallest box the fit-to-screen grid will use before it falls back to scrolling. */
const MIN_DENSE_BOX = 64;
const MAX_BOX = 250;

interface FitGrid {
  cols: number;
  size: number;
  gap: number;
}

/**
 * Picks the column count that makes every box as large as possible while the
 * whole wall still fits the available space — so a 100-box wall is visible and
 * navigable at a glance on a projector, rather than 20 rows of scrolling.
 */
function bestGrid(count: number, width: number, height: number): FitGrid {
  const gap = Math.max(8, Math.min(18, Math.round(width * 0.009)));
  let best: FitGrid = { cols: 1, size: 0, gap };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const size = Math.min(
      MAX_BOX,
      Math.floor((width - (cols - 1) * gap) / cols),
      Math.floor((height - (rows - 1) * gap) / rows),
    );
    if (size > best.size) best = { cols, size, gap };
  }
  if (best.size < MIN_DENSE_BOX) {
    // Too small to read: keep readable boxes and let the grid scroll instead.
    const cols = Math.max(1, Math.floor((width + gap) / (MIN_DENSE_BOX + gap)));
    return { cols, size: Math.min(MAX_BOX, Math.floor((width - (cols - 1) * gap) / cols)), gap };
  }
  return best;
}

/**
 * The box wall. Every box shows only its number — the puzzle type inside
 * stays a mystery until the lid comes off.
 *
 * Layout: a compact STICKY header (partner logos, title, subtitle, live
 * counters, sound controls) sits above an independently scrolling grid. The
 * app itself never scrolls — only the grid does — so on a projector the header
 * is always in view while the facilitator scrolls to the last box.
 *
 * Scroll position is lifted to the parent: when the facilitator opens a box and
 * later returns, the grid is restored to exactly where they left off (and the
 * most-recently-used box is nudged into view), rather than snapping back to
 * row one.
 */
export default function BoxWall({
  boxes,
  openedBoxes,
  correctCount,
  notQuiteCount,
  lastBox,
  eventName,
  settings,
  onSettingsChange,
  getInitialScroll,
  onScroll,
  onSelect,
  onShowResults,
}: {
  /** The box numbers to render — one per ACTIVE question, already 1..N. */
  boxes: number[];
  openedBoxes: number[];
  correctCount: number;
  notQuiteCount: number;
  /** The box opened most recently — kept in view when we return to the grid. */
  lastBox: number | null;
  /** The selected event, shown in the subtitle. */
  eventName: string;  // Empty for the original game, whose subtitle is unchanged.
  settings: GameSettings;
  onSettingsChange: (patch: Partial<GameSettings>) => void;
  /** Reads the last-saved scroll position (called inside the restore effect). */
  getInitialScroll: () => number;
  onScroll: (scrollTop: number) => void;
  onSelect: (boxNumber: number, rect: DOMRect) => void;
  /** Jump to the results screen — offered once every box has been opened. */
  onShowResults: () => void;
}) {
  // Every rendered box comes from the active question list, so a box with no
  // question behind it is impossible by construction.
  const remaining = boxes.filter((n) => !openedBoxes.includes(n)).length;

  const dense = boxes.length >= DENSE_FROM;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<FitGrid | null>(null);

  // Measure the scrolling area and re-fit the dense grid whenever it resizes.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!dense || !el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      // Leave room for the one-line caption under the wall.
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 44;
      if (w > 0 && h > 0) setFit(bestGrid(boxes.length, w, h));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [dense, boxes.length]);
  const lastBoxRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // Restore the previous scroll position the moment the grid mounts, before
  // paint, so there is no visible jump. If a box was just used, make sure it is
  // on screen (it may have been just off the restored viewport).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = getInitialScroll();

    if (lastBox && lastBoxRef.current) {
      const box = lastBoxRef.current;
      const top = box.offsetTop;
      const bottom = top + box.offsetHeight;
      const viewTop = el.scrollTop;
      const viewBottom = viewTop + el.clientHeight;
      if (top < viewTop || bottom > viewBottom) {
        box.scrollIntoView({ block: "center" });
      }
    }
    // Only a real overflow warrants the "scroll for more" nudge.
    setShowScrollHint(el.scrollHeight > el.clientHeight + 8);
    // getInitialScroll is a stable getter; lastBox drives the re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBox]);

  // Report scroll position up (so it survives the trip through a puzzle) and
  // retire the hint as soon as the facilitator scrolls.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const handle = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        onScroll(el.scrollTop);
        if (el.scrollTop > 24) setShowScrollHint(false);
      });
    };
    el.addEventListener("scroll", handle, { passive: true });
    return () => {
      el.removeEventListener("scroll", handle);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [onScroll]);

  return (
    <div className="flex h-full flex-col">
      {/* ---------------- Sticky header ---------------- */}
      <GameHeaderFull
        className="sticky top-0 z-20 shrink-0 border-b border-ink/5 bg-white/80 px-[clamp(1rem,3vw,3rem)] pb-3 pt-3 backdrop-blur-md"
        title={
          <h1
            className="game-header-title font-black leading-none tracking-tight text-ink"
            style={{ fontSize: "clamp(1.4rem, 3.4vw, 3rem)" }}
          >
            CRACK THE{" "}
            <span className="relative inline-block text-ren-green">
              BOX
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-ren-green/25"
              />
            </span>
          </h1>
        }
        subtitle={
          <p
            className="mt-1 font-bold uppercase tracking-[0.3em] text-ink-soft"
            style={{ fontSize: "clamp(0.55rem, 1vw, 0.9rem)" }}
          >
            {eventName ? `${eventName} · ` : ""}Pick it. Open it. Solve it.
          </p>
        }
        actions={
          <>
            <SoundControl settings={settings} onSettingsChange={onSettingsChange} />
            <FullscreenControl />
          </>
        }
        below={
          /* Live counters — their own row, so a logo can never overlap them. */
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
            <Stat label="Opened" value={openedBoxes.length} tone="ink" />
            <Stat label="Correct" value={correctCount} tone="green" />
            <Stat label="Not Quite" value={notQuiteCount} tone="amber" />
            <Stat label="Remaining" value={remaining} tone="ink" />
          </div>
        }
      />

      {/* ---------------- Scrolling grid ---------------- */}
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[clamp(1rem,3vw,3rem)] ${
          dense ? "pb-3 pt-3" : "pb-24 pt-5"
        }`}
      >
        {boxes.length === 0 ? (
          <div className="mx-auto mt-16 max-w-[46ch] text-center">
            <p className="text-5xl" aria-hidden>
              📦
            </p>
            <p className="mt-4 font-black uppercase tracking-tight text-ink" style={{ fontSize: "clamp(1.1rem, 2.4vw, 1.8rem)" }}>
              No questions are active
            </p>
            <p className="mt-2 font-semibold text-ink-soft">
              Open{" "}
              <a
                href="/admin/questions"
                className="font-black text-ren-green-deep underline underline-offset-2"
              >
                Manage questions
              </a>{" "}
              and switch some back on to fill the wall.
            </p>
          </div>
        ) : (
        <div
          className={
            dense
              ? "mx-auto grid w-fit justify-center"
              : "mx-auto grid w-full max-w-[1680px] grid-cols-2 gap-[clamp(0.75rem,1.8vw,1.9rem)] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          }
          style={
            dense && fit
              ? { gridTemplateColumns: `repeat(${fit.cols}, ${fit.size}px)`, gap: fit.gap }
              : undefined
          }
          data-wall={dense ? "dense" : "standard"}
          data-boxes={boxes.length}
        >
          {boxes.map((n, i) => (
            <motion.div
              key={n}
              ref={n === lastBox ? lastBoxRef : undefined}
              // Cap each box so it keeps its attractive ~240px size and never
              // balloons on a large projector — bigger screens simply show
              // more boxes, they do not blow up the ones already visible.
              className={dense ? "" : "mx-auto aspect-square w-full max-w-[250px]"}
              style={dense && fit ? { width: fit.size, height: fit.size } : undefined}
              initial={{ opacity: 0, y: 22, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                // Only the first ~15 stagger in; the rest (off-screen) snap in
                // so scrolling down never waits on an animation queue.
                delay: Math.min(i, 15) * 0.025,
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
            >
              <MysteryBox
                boxNumber={n}
                opened={openedBoxes.includes(n)}
                onSelect={onSelect}
                numberSize={dense && fit ? `${Math.round(fit.size * 0.3)}px` : undefined}
              />
            </motion.div>
          ))}
        </div>
        )}

        {boxes.length > 0 && (
          <div className={`flex flex-col items-center gap-4 ${dense ? "mt-3" : "mt-6"}`}>
            <p className="text-center text-sm font-semibold text-ink-soft">
              {remaining > 0
                ? "Pick a box — nobody knows what is inside."
                : "Every box is open. Time for the results!"}
            </p>
            {remaining === 0 && (
              <button
                type="button"
                onClick={onShowResults}
                className="rounded-full border-b-4 border-ren-green-deep bg-ren-green px-8 py-3 text-base font-black uppercase tracking-wide text-white shadow-lift transition hover:brightness-105 active:translate-y-0.5 active:border-b-2"
              >
                See results →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transient "scroll for more" nudge */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2"
          >
            <span className="flex items-center gap-2 rounded-full bg-ink/90 px-5 py-2.5 text-sm font-bold text-white shadow-lift">
              Scroll to see more boxes
              <motion.span
                aria-hidden
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.1, repeat: Infinity }}
              >
                ↓
              </motion.span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ink" | "green" | "amber";
}) {
  const tones = {
    ink: "border-ink/10 bg-white text-ink",
    green: "border-ren-green/25 bg-ren-green-soft text-ren-green-deep",
    amber: "border-amber-300/50 bg-amber-50 text-amber-700",
  };
  return (
    <div
      className={`flex items-baseline gap-2 rounded-full border px-3.5 py-1.5 shadow-sm ${tones[tone]}`}
    >
      <span className="text-lg font-black leading-none sm:text-xl">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
        {label}
      </span>
    </div>
  );
}
