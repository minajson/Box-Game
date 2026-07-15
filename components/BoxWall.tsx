"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MysteryBox from "./MysteryBox";
import EventTag from "./EventTag";
import SoundControl from "./SoundControl";
import { TOTAL_BOXES } from "@/data/puzzles";
import type { GameSettings } from "@/lib/types";

/**
 * The 50-box wall. Every box shows only its number — the puzzle type inside
 * stays a mystery until the lid comes off.
 *
 * Layout: a compact STICKY header (title, subtitle, live counters, event
 * identifier, sound controls) sits above an independently scrolling grid. The
 * app itself never scrolls — only the grid does — so on a projector the header
 * is always in view while the facilitator scrolls down to box 50.
 *
 * Scroll position is lifted to the parent: when the facilitator opens a box and
 * later returns, the grid is restored to exactly where they left off (and the
 * most-recently-used box is nudged into view), rather than snapping back to
 * row one.
 */
export default function BoxWall({
  openedBoxes,
  correctCount,
  notQuiteCount,
  lastBox,
  settings,
  onSettingsChange,
  getInitialScroll,
  onScroll,
  onSelect,
}: {
  openedBoxes: number[];
  correctCount: number;
  notQuiteCount: number;
  /** The box opened most recently — kept in view when we return to the grid. */
  lastBox: number | null;
  settings: GameSettings;
  onSettingsChange: (patch: Partial<GameSettings>) => void;
  /** Reads the last-saved scroll position (called inside the restore effect). */
  getInitialScroll: () => number;
  onScroll: (scrollTop: number) => void;
  onSelect: (boxNumber: number, rect: DOMRect) => void;
}) {
  const boxes = Array.from({ length: TOTAL_BOXES }, (_, i) => i + 1);
  const remaining = TOTAL_BOXES - openedBoxes.length;

  const scrollRef = useRef<HTMLDivElement | null>(null);
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
      <header className="sticky top-0 z-20 shrink-0 border-b border-ink/5 bg-white/80 px-[clamp(1rem,3vw,3rem)] pb-3 pt-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="truncate font-black leading-none tracking-tight text-ink"
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
            <p
              className="mt-1 font-bold uppercase tracking-[0.3em] text-ink-soft"
              style={{ fontSize: "clamp(0.55rem, 1vw, 0.9rem)" }}
            >
              Pick it. Open it. Solve it.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-[clamp(0.75rem,1.5vw,1.5rem)]">
            <SoundControl settings={settings} onSettingsChange={onSettingsChange} />
            <EventTag />
          </div>
        </div>

        {/* Live counters */}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
          <Stat label="Opened" value={openedBoxes.length} tone="ink" />
          <Stat label="Correct" value={correctCount} tone="green" />
          <Stat label="Not Quite" value={notQuiteCount} tone="amber" />
          <Stat label="Remaining" value={remaining} tone="ink" />
        </div>
      </header>

      {/* ---------------- Scrolling grid ---------------- */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[clamp(1rem,3vw,3rem)] pb-24 pt-5"
      >
        <div className="mx-auto grid w-full max-w-[1680px] grid-cols-2 gap-[clamp(0.75rem,1.8vw,1.9rem)] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {boxes.map((n, i) => (
            <motion.div
              key={n}
              ref={n === lastBox ? lastBoxRef : undefined}
              // Cap each box so it keeps its attractive ~240px size and never
              // balloons on a large projector — bigger screens simply show
              // more boxes, they do not blow up the ones already visible.
              className="mx-auto aspect-square w-full max-w-[250px]"
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
              />
            </motion.div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm font-semibold text-ink-soft">
          {remaining > 0
            ? "Pick a box — nobody knows what is inside."
            : "Every box is open. Time for the results!"}
        </p>
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
