"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import EventTag from "./EventTag";
import { sound } from "@/lib/sound";
import { TOTAL_BOXES } from "@/data/puzzles";

/**
 * The closing celebration. Deliberately simple — four numbers and a well done.
 * The music keeps playing underneath; nothing here restarts it.
 */
export default function ResultsScreen({
  correctCount,
  notQuiteCount,
  openedCount,
  onPlayAgain,
  onBackToBoxes,
}: {
  correctCount: number;
  notQuiteCount: number;
  openedCount: number;
  onPlayAgain: () => void;
  onBackToBoxes: () => void;
}) {
  useEffect(() => {
    void sound.play("fanfare");
  }, []);

  const remaining = TOTAL_BOXES - openedCount;

  return (
    <div className="flex h-full flex-col items-center justify-center px-[5vw] py-6 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="mb-5"
        style={{ fontSize: "clamp(3rem, 9vh, 6rem)" }}
        aria-hidden
      >
        🎉
      </motion.div>

      <motion.h1
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="font-black uppercase leading-none tracking-tight text-ink"
        style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}
      >
        Every box <span className="text-ren-green">cracked!</span>
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="mt-4 max-w-[52ch] font-semibold text-ink-soft"
        style={{ fontSize: "clamp(0.9rem, 1.7vw, 1.4rem)" }}
      >
        Great thinking, great listening, great teamwork. That is exactly what
        People Day is about.
      </motion.p>

      <motion.div
        initial={{ y: 26, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <Tile value={openedCount} label="Boxes opened" tone="ink" />
        <Tile value={correctCount} label="Correct" tone="green" />
        <Tile value={notQuiteCount} label="Not quite" tone="amber" />
        <Tile value={remaining} label="Remaining" tone="ink" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        {remaining > 0 && (
          <button
            type="button"
            onClick={onBackToBoxes}
            className="rounded-full border-b-4 border-ink/20 bg-white px-7 py-3 text-sm font-black uppercase tracking-wide text-ink shadow-panel transition hover:bg-ink/[0.04] active:translate-y-0.5"
          >
            ← Back to boxes
          </button>
        )}
        <button
          type="button"
          onClick={onPlayAgain}
          className="rounded-full border-b-4 border-ren-green-deep bg-ren-green px-9 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lift transition hover:bg-ren-green-deep active:translate-y-0.5"
        >
          Play again
        </button>
      </motion.div>

      <div className="mt-10">
        <EventTag />
      </div>
    </div>
  );
}

function Tile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "ink" | "green" | "amber";
}) {
  const tones = {
    ink: "border-ink/10 bg-white text-ink",
    green: "border-ren-green/25 bg-ren-green-soft text-ren-green-deep",
    amber: "border-amber-300/50 bg-amber-50 text-amber-700",
  };
  return (
    <div
      className={`min-w-[clamp(7rem,14vw,11rem)] rounded-3xl border-2 px-6 py-5 shadow-panel ${tones[tone]}`}
    >
      <div
        className="font-black leading-none"
        style={{ fontSize: "clamp(2rem, 4.5vw, 3.6rem)" }}
      >
        {value}
      </div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
        {label}
      </div>
    </div>
  );
}
